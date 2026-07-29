# Portabilidade

O núcleo conceitual é independente de tecnologia e agente. Não inserir Tailwind, CSS, React, Next.js, shadcn/ui, React Native ou tokens específicos nas regras autorais.

## Codex

Manter `SKILL.md`, `agents/openai.yaml` e `references/`. Invocar como `$design-direction`. Usar ferramentas de código, browser, imagem ou Figma somente quando a tarefa exigir.

## Claude Code

Preservar integralmente os fundamentos e referências. Criar um adaptador fino que:

- descreva os gatilhos;
- carregue somente referências relevantes;
- respeite instruções locais do repositório;
- adapte implementação à stack encontrada;
- mantenha o mesmo formato de veredito.

Não copiar metadados específicos do Codex como se fossem instruções universais.

## Agente genérico

Fornecer:

1. descrição de gatilhos;
2. hierarquia de decisão;
3. regras autorais;
4. perfil contextual;
5. workflow escolhido;
6. template de saída.

## Invariantes

Todo adaptador deve:

- usar os mesmos fundamentos para gerar e revisar;
- manter o núcleo independente de tecnologia;
- exigir aprovação antes de incorporar nova preferência;
- distinguir evidência, inferência e preferência;
- preservar perfis contextuais;
- emitir veredito e risco residual em revisão;
- não impor identidade visual única entre projetos.

## Teste de paridade

Aplicar o mesmo artefato e o mesmo pedido em dois agentes. Comparar:

- perfil inferido;
- violações fundamentais;
- preservação de padrões positivos;
- prioridade dos achados;
- veredito;
- estrutura do redesign.

Variações de linguagem são aceitáveis; divergências em fundamentos ou prioridade exigem ajuste do adaptador.
