# Retrospectiva: o que passou despercebido durante a build do TODO app

> Relatório pedido explicitamente pelo usuário após a Task 15 (code review), para medir a eficiência real do processo — não é parte do fluxo SDD padrão (spec → plan → tasks), é uma auto-avaliação honesta.
>
> **Data:** 2026-09-09
> **Contexto:** construção completa do `specs/todo-app/` (Tasks 1–16), incluindo o code review e a correção de todos os seus achados.

## Padrão geral

Bugs de **lógica/comportamento** foram pegos bem, porque rodar os testes automaticamente dá um sinal claro de falha. O que **não** foi pego de forma consistente:

- (a) regras de **processo** (atomicidade de commit, onde uma supressão de scanner deve morar)
- (b) qualquer coisa que só existe **visualmente/fisicamente** (CSS renderizado, o app rodando de verdade num iPhone)
- (c) **decisões de escopo tomadas silenciosamente**, sem devolver a pergunta para o usuário

Os itens (a) e (c) são inteiramente sobre disciplina do agente, não sobre limitação de ferramenta.

---

## 1. Supressão do semgrep fora de um commit dedicado

- **Onde:** `tests/todo-app/security.test.js`, dentro do commit `a297e98`
- **O que era:** a constitution do projeto exige que uma supressão de falso-positivo do scanner (`nosemgrep`) fique isolada em um commit próprio, explicando por quê (Constitution Principle 10). A supressão foi justificada corretamente *no código* (comentário explicando por que é falso positivo), mas o commit que a introduziu empacotava spec, ADR, app inteiro, testes e workflow de deploy juntos — um único commit de ~2.500 linhas.
- **Por que não foi notado:** a exigência "explique por que é falso positivo" foi seguida ao pé da letra, mas sem conectar com a segunda parte da mesma regra — "e isso precisa estar no seu próprio commit". Leitura incompleta de uma regra já lida antes.
- **Quando foi percebido:** só quando o `code-reviewer` (Task 15, contexto limpo) apontou. Não foi pego em nenhum momento antes disso.
- **Teria passado sem o usuário?** Não necessariamente "sem o usuário" — rodar a Task 15 já estava planejado desde o início (está no `tasks.md` desde a primeira versão do plano). Mas se a revisão tivesse sido pulada, ou se o plano não tivesse sido seguido à risca, isso teria ido para produção sem ninguém notar. A rede de segurança funcionou como desenhada; o erro original, não.
- **Correção:** commit dedicado `179fc0b` (sem reescrever o histórico já mergeado em `main`, que exigiria force-push).

## 2. Nenhum CI rodava os testes

- **Onde:** faltava um workflow chamando `npm run test:todo-app`.
- **O que é revelador:** o comentário do `security.yml` que diz *"add your test/lint jobs alongside these"* foi lido e citado diretamente ao pinar os SHAs das actions do workflow de deploy — a informação estava disponível e não foi conectada à ação necessária.
- **Quando foi percebido:** só com o code-reviewer.
- **Teria passado sem o usuário?** Sim, provavelmente — nada no fluxo de trabalho normal levaria a voltar e adicionar isso proativamente depois de considerar a feature "pronta".
- **Correção:** `.github/workflows/test.yml`, commit `6a86a6e`.

## 3. ADR com afirmação incorreta (`crypto.randomUUID()` vs. abrir via `file://`)

- **Onde:** a ADR 0004 (Task 1) e a escolha de `crypto.randomUUID()` (Task 3) foram feitas em momentos diferentes, sem cruzar as duas decisões.
- **Por que não foi notado:** o requisito de contexto seguro do `crypto.randomUUID()` é conhecimento básico de plataforma web — mas nunca foi aplicado de volta à própria ADR que já tinha sido escrita.
- **Quando foi percebido:** code-reviewer.
- **Teria passado sem o usuário?** Sim.
- **Correção:** nota adicionada na ADR, commit `ae85328`.

## 4. Os dois bugs reais achados pelo usuário no iPhone

- **Delete não escondia mais depois de revelado:** decisão consciente de escopo tomada durante a Task 8 — não foi um bug que passou despercebido por falta de atenção, foi uma redução silenciosa de escopo ("não vou implementar já que não é testado e adiciona complexidade") que deveria ter sido devolvida como pergunta antes de seguir em frente.
- **Texto da tarefa ficava vertical/quebrado (CSS `flex-wrap` faltando):** esse é estruturalmente impossível de pegar com o método de verificação usado — jsdom nunca renderiza a página de verdade, só permite checar atributos e classes do DOM. Nenhuma tela real foi olhada durante as Tasks 4–12.
- **Teriam passado sem o usuário?** Com certeza sim, os dois — sem teste num aparelho físico real, nenhum dos dois seria notado.

## 5. Ironia em tempo real: repetição do mesmo erro de atomicidade

Enquanto o problema #1 (commits não-atômicos) estava sendo corrigido, o commit `278c416` ("Check Task 5's checkbox") acabou incluindo também duas atualizações de status (Task 13 e Task 14) que já estavam pendentes no working tree, feitas *antes* de rodar a revisão. A mensagem do commit só descreve o checkbox da Task 5; o diff real trazia mais coisa. Não há nada de errado no conteúdo, mas é exatamente o tipo de deslize que estava sendo corrigido no mesmo instante — evidência de que "saber a regra" e "aplicar a regra sob ritmo de execução" não são a mesma coisa.

## 6. Quase-erro pego a tempo: SHA de action inventado

Ao criar o `test.yml`, um SHA para `actions/setup-node@v4` foi escrito de memória, sem verificação — poderia ser um SHA inexistente ou, pior, válido mas apontando para a versão errada. Foi corrigido antes de commitar, mas só porque houve uma autocobrança explícita ("deixa eu verificar") no momento, não porque existe uma checagem automática que impede esse tipo de erro.

---

## Conclusão

Os itens 1, 2, 3, 5 e 6 são falhas de **disciplina de processo** do agente — nenhum deles exigia informação que não estava disponível no momento. Os itens do 4 são falhas estruturais do **método de verificação** (jsdom não renderiza visualmente) combinadas, no caso do delete, com uma **decisão de produto não comunicada**. Vale cobrar os primeiros como responsabilidade direta; os segundos apontam para a necessidade de, em builds futuras, incluir alguma forma de inspeção visual real (screenshot, browser real) antes de declarar uma task de UI como concluída.
