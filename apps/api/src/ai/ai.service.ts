import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { BlockType } from '@prisma/client';
import { AssistDocumentDto } from './dto/assist-document.dto';

type PlannedSection = {
  heading: string;
  intent: string;
};

@Injectable()
export class AiService {
  async assistDocument(input: AssistDocumentDto) {
    const client = this.getClient();
    const model = this.getModel();
    const plan = await this.buildPlan(client, model, input);
    const generatedBlocks = await this.expandPlan(client, model, input, plan);

    return {
      plan,
      blocks: generatedBlocks,
    };
  }

  private getClient() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        'Configure ANTHROPIC_API_KEY para usar a IA embutida.',
      );
    }

    return new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private getModel() {
    if (!process.env.ANTHROPIC_MODEL) {
      throw new ServiceUnavailableException(
        'Configure ANTHROPIC_MODEL para escolher o modelo Claude usado no editor.',
      );
    }

    return process.env.ANTHROPIC_MODEL;
  }

  private async buildPlan(
    client: Anthropic,
    model: string,
    input: AssistDocumentDto,
  ) {
    const response = await client.messages.create({
      model,
      max_tokens: 700,
      temperature: 0.3,
      system:
        'Você é um estrategista de conteúdo para um editor de blocos colaborativo. Responda sempre com JSON válido.',
      messages: [
        {
          role: 'user',
          content: `
Crie um plano em JSON para o documento abaixo.

Formato esperado:
{
  "summary": "string",
  "sections": [
    { "heading": "string", "intent": "string" }
  ]
}

Documento: ${input.documentTitle}
Ação: ${input.action}
Tom: ${input.tone || 'claro, convincente e moderno'}
Instrução: ${input.instruction}
Contexto atual:
${input.blocks.map((block, index) => `${index + 1}. [${block.type}] ${block.content}`).join('\n')}
          `.trim(),
        },
      ],
    });

    const text = this.extractText(response);
    const parsed = this.extractJson<{
      summary: string;
      sections: PlannedSection[];
    }>(text);

    if (parsed?.sections?.length) {
      return parsed;
    }

    return {
      summary: 'Plano criado a partir da instrução enviada.',
      sections: [
        {
          heading: 'Draft inicial',
          intent: input.instruction,
        },
      ],
    };
  }

  private async expandPlan(
    client: Anthropic,
    model: string,
    input: AssistDocumentDto,
    plan: { summary: string; sections: PlannedSection[] },
  ) {
    const response = await client.messages.create({
      model,
      max_tokens: 1400,
      temperature: 0.55,
      system:
        'Você escreve para um editor tipo Notion. Responda apenas com JSON válido contendo um array de blocos.',
      messages: [
        {
          role: 'user',
          content: `
Com base no plano abaixo, gere blocos prontos para inserir no editor.

Formato esperado:
[
  { "type": "HEADING|PARAGRAPH|TODO|BULLET|QUOTE|CALLOUT", "content": "string", "metadata": {} }
]

Documento: ${input.documentTitle}
Ação: ${input.action}
Instrução: ${input.instruction}
Tom: ${input.tone || 'claro, convincente e moderno'}
Resumo do plano: ${plan.summary}
Seções:
${plan.sections.map((section, index) => `${index + 1}. ${section.heading}: ${section.intent}`).join('\n')}
          `.trim(),
        },
      ],
    });

    const text = this.extractText(response);
    const parsed = this.extractJson<
      Array<{
        type: string;
        content: string;
        metadata?: Record<string, unknown>;
      }>
    >(text);

    if (!parsed?.length) {
      return [
        {
          id: crypto.randomUUID(),
          type: BlockType.PARAGRAPH,
          content:
            text ||
            'Não foi possível estruturar o retorno da IA. Tente novamente.',
          metadata: {},
        },
      ];
    }

    return parsed.slice(0, 12).map((block) => ({
      id: crypto.randomUUID(),
      type: this.normalizeBlockType(block.type),
      content: block.content,
      metadata: block.metadata ?? {},
    }));
  }

  private extractText(response: Anthropic.Messages.Message) {
    return response.content
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();
  }

  private extractJson<T>(value: string): T | null {
    const fencedJson = value.match(/```json\s*([\s\S]*?)```/i)?.[1];
    const candidate = fencedJson || value;
    const trimmed = candidate.trim();
    const firstBracket = Math.min(
      ...[trimmed.indexOf('{'), trimmed.indexOf('[')].filter(
        (index) => index >= 0,
      ),
    );
    const lastCurly = trimmed.lastIndexOf('}');
    const lastSquare = trimmed.lastIndexOf(']');
    const lastBracket = Math.max(lastCurly, lastSquare);

    if (firstBracket < 0 || lastBracket < 0) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1)) as T;
    } catch (error) {
      throw new InternalServerErrorException(
        `Falha ao interpretar a resposta da IA: ${(error as Error).message}`,
      );
    }
  }

  private normalizeBlockType(value: string) {
    const normalized = value.toUpperCase();

    if (normalized in BlockType) {
      return BlockType[normalized as keyof typeof BlockType];
    }

    return BlockType.PARAGRAPH;
  }
}
