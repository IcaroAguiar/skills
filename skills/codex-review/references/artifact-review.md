# Plans and artifact review

Pin the SHA-256 of the artifact and the versions of the requirements and sources it describes. Preserve the requested format; a document review needs neither a manufactured PR nor unrelated code tests.

For a plan, assess requirement coverage, source fidelity, ownership, coherent task sizes, dependencies, concrete contracts and states, failure recovery and meaningful acceptance evidence. Label proposed endpoints as proposed. A plan may be approved for implementation while integration or production proof remains future work, if it specifies those gates and no blocking design gap remains.

For a skill, read the entrypoint and relevant references. Check usable tools and account routing, trigger precision, ownership and authorization, reviewer independence, completion criteria and compatible references. Where useful, forward-test a realistic request in a separate scoped reviewer context without embedding the intended verdict or suspected defect.

For visual output, inspect the produced artifact and render the relevant pages or slides with the format's own tooling. Review visible output against the request and the technical claims against their sources.

Use Standards/Spec findings and the same gates and verdicts as code review. `VERIFICATION` covers checks appropriate to the artifact, not invented runtime proof. Include the hash in the verdict. Corrections go to a separate fixer, then an independent review of the new hash.

```markdown
Você é o revisor independente. Avalie {{ARTEFATO_CAMINHO_SHA256}} contra {{PEDIDO_REQUISITOS_FONTES_FIXAS}}. Responda em {{IDIOMA}}.
Ownership/autorização: {{LEITURA_NO_ALVO_E_LIMITE_DAS_VALIDACOES}}.
Standards: {{AGENTS_SKILL_DE_FORMATO}}.
Evidência do autor: {{VALIDACOES_REALMENTE_EXECUTADAS}}.
Leia documentos e fontes pertinentes. Não edite o alvo nem execute outra revisão. Separe Standards e Spec; cada achado precisa de severidade, local, impacto, evidência, correção mínima e validação. Diferencie desenho, código e prova executada. Termine com gates, hash e APPROVE, APPROVE_WITH_RESIDUAL_RISK, REQUEST_CHANGES ou BLOCKED.
```
