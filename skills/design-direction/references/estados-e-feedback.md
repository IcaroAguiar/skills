# Estados e feedback

Comunicar estado de forma hierárquica, contextual e inequívoca. O usuário deve distinguir rapidamente:

- estado geral da tarefa ou entidade;
- estados pertencentes a partes específicas;
- situações que exigem ação;
- feedback temporário;
- metadados históricos ou administrativos.

## Regra principal

Todo indicador de estado responde:

1. Estado de quê?
2. Qual é o seu alcance?
3. Exige alguma ação?
4. É permanente, temporário ou histórico?

Quando essas respostas não forem evidentes, reformular o texto, reposicionar o indicador ou removê-lo.

## Hierarquia

1. Estado global da tarefa ou entidade.
2. Alertas e pendências que exigem ação.
3. Estado local de componente ou seção.
4. Feedback transitório, como salvamento ou envio.
5. Metadados históricos e informações administrativas.

Níveis diferentes não competem visualmente. Usar intensidade conforme urgência e necessidade de ação, não conforme conveniência do componente.

## Evitar

- múltiplos indicadores sem relação ou ordem perceptível;
- badges globais e locais com o mesmo peso;
- repetição do mesmo estado em regiões diferentes;
- metadados estáticos apresentados como alerta ou status;
- mensagens vagas, como “Tudo em dia”, sem objeto explícito;
- estados simultâneos que pareçam contraditórios;
- destaque persistente para estados positivos que não exigem atenção;
- cards exclusivos apenas para versão, data ou quantidade.

## Preferir

- um estado global próximo ao título ou contexto principal;
- estados locais junto ao objeto que representam;
- feedback de salvamento próximo ao formulário ou à ação correspondente;
- pendências próximas da seção em que podem ser resolvidas;
- metadados discretos em lista, linha ou grupo estruturado;
- texto que nomeia explicitamente o objeto do estado;
- destaque maior para situações acionáveis que para confirmações informativas.

## Exemplo

### Fragmentado

```text
[Atendimento em andamento]

Pendências documentais                  [Tudo em dia]

Registro longitudinal                  [Salvo]

[Estado do registro]
Versão 1
0 documentos
```

O usuário precisa inferir alcance, relação e prioridade entre quatro tratamentos semelhantes.

### Hierárquico

```text
Belka
Atendimento em andamento · Alterações salvas

Pendências documentais
Nenhuma pendência.

Informações do registro
Iniciado em    29/07/2026, 00:21
Versão         1
Documentos     0
```

O estado global permanece no contexto principal, o estado local pertence à seção e os metadados deixam de competir como alertas.

## Critérios verificáveis

- Existe no máximo um indicador principal de estado global.
- Cada estado local aparece junto ao objeto que representa.
- Nenhum estado é repetido sem justificativa funcional.
- Metadados estáticos não usam badge, alerta ou destaque excessivo.
- Estados acionáveis têm prioridade maior que estados informativos.
- Mensagens positivas não competem com tarefas ou pendências.
- Estado global, local, transitório e histórico são distinguíveis.
- Indicadores simultâneos não criam contradição aparente.

## Exceções

Repetir um estado pode ser necessário quando:

- conteúdo principal e ação correspondente estão muito distantes;
- há risco real de perda de contexto durante a navegação;
- regiões diferentes representam escopos claramente distintos;
- acessibilidade ou segurança exigem redundância.

A repetição mantém o mesmo significado, declara o escopo e não introduz prioridade visual conflitante.

## Heurística de revisão

Antes de adicionar badge, alerta ou bloco de estado, verificar:

1. A informação altera a próxima decisão?
2. Já está comunicada em outro lugar?
3. O escopo está evidente?
4. Precisa de destaque permanente?
5. Poderia ser texto ou metadado simples?

Usar destaque visual para orientar decisões, não para decorar informações de estado.
