# Captura de preferências

Tratar referência, screenshot ou comentário como evidência de uma preferência candidata, não como instrução automática para alterar a direção.

## Fluxo

1. Descrever o sinal observado.
2. Identificar o problema que a preferência tenta evitar ou o resultado que busca.
3. Formular uma regra independente da solução específica.
4. Classificar como princípio, heurística, padrão preferido, antipadrão ou exceção.
5. Identificar contextos aplicáveis e não aplicáveis.
6. Definir critérios verificáveis.
7. Verificar conflitos e redundâncias com regras existentes.
8. Propor a alteração.
9. Aguardar aprovação explícita.
10. Somente após aprovação, incorporar a menor mudança coerente.

## Saída obrigatória

```text
Preferência identificada:
Evidência:
Problema ou intenção:
Regra proposta:
Classificação:
Contextos aplicáveis:
Contextos não aplicáveis:
Exceções:
Critérios verificáveis:
Conflitos ou redundâncias:
Mudança exata proposta:
Status: aguardando aprovação
```

## Qualidade da regra

Uma boa regra:

- explica intenção;
- oferece alternativa;
- admite exceção justificada;
- pode ser auditada;
- não depende de uma marca ou screenshot;
- não prescreve tecnologia;
- não prejudica fundamentos superiores.

Rejeitar formulações vagas como “deixar premium”, “mais moderno” ou “mais clean” sem critérios observáveis.

## Filtro de promoção

Antes de promover uma preferência, responder:

1. Qual problema de uso a regra resolve?
2. Há impacto em clareza, eficiência, acessibilidade, erro ou conclusão da tarefa?
3. A regra funciona em mais de um produto?
4. Existem contextos legítimos em que o padrão criticado é adequado?
5. É possível definir critérios verificáveis?

Se a justificativa for apenas “parece mais bonito”, registrar como preferência estética. Se houver efeito demonstrável sobre compreensão, esforço, erro ou conclusão, a regra pode ser promovida a heurística de design.

## Incorporação

Não reescrever toda a direção por uma preferência localizada. Atualizar a camada mais estreita possível e registrar qualquer exceção ou conflito resolvido.
