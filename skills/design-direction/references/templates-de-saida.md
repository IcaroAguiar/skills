# Templates de saída

## Revisão completa

```text
Perfil principal:
Influências secundárias:
Evidência avaliada:
Veredito:

Resumo executivo:

Prova e limitações:
- Observado:
- Não verificado:

Notas:
| Categoria | Nota | Justificativa |

Achados:
1. [Prioridade] Título
   Evidência:
   Impacto:
   Recomendação:

Critério visual:
- Molduras e função:
- Títulos como containers:
- Proporção e ritmo:
- Avisos em destaque:
- Constelação de clichês:
- Especificidade do domínio:

Critério funcional:
- Formulários extensos:
- Hierarquia de estados:
- Coleções e ações:
- Ciclo de vida:
- Tabelas e densidade:
- Verificado:
- Falhas:
- N/V:

Padrões positivos a preservar:

Recomendações priorizadas:

Wireframe ASCII (quando esclarecer layout ou fluxo):

Exceções e risco residual:
```

Quando o usuário também pedir redesign, acrescentar a saída da seção **Redesign**.
Quando o artefato estiver ilegível, substituir a revisão por: `Sem veredito — evidência bloqueada`, causa técnica e prova necessária.

## Revisão rápida

```text
Perfil:
Veredito:

3 principais problemas:
1.
2.
3.

3 ações recomendadas:
1.
2.
3.

Evidência ausente:
```

## Geração

```text
Contexto inferido:
Objetivo:
Usuário e tarefa principal:
Premissas:

Hierarquia de informação:
Estrutura e fluxo:
Padrões aplicados:
Estados e feedback:
Responsividade e ergonomia:
Riscos e exceções:

Wireframe ASCII:

Autoavaliação:
- Critério funcional:
- Critério visual:
- Critério de evidência:
```

## Redesign

```text
Problema resolvido:
Elementos preservados:
Elementos removidos ou simplificados:

Nova estrutura:
Nova hierarquia:
Comportamento:
Estados:
Responsividade:

Mapa problema -> mudança:

Wireframe ASCII:

Trade-offs e risco residual:
```

## Wireframe ASCII

Usar apenas quando a relação espacial ou a sequência ficar mais clara. Manter rótulos do domínio e largura legível. Não usar ASCII como decoração.

Exemplo:

```text
┌──────────────── Painel lateral ────────────────┐
│ Resumo do atendimento                         │
│ Status · bloqueios · motivo                   │
├───────────────────────────────────────────────┤
│ Anexar documento                              │
├───────────────────────────────────────────────┤
│ Estado do registro                            │
│ Início · versão · documentos                  │
└───────────────────────────────────────────────┘
```
