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

## 7. Warning de depreciação do Node.js 20 no `actions/checkout`

- **Onde:** SHA fixado para `actions/checkout` (`34e11487...`) em `security.yml` (4 usos) e reaproduzido em `test.yml` e `deploy-pages.yml` (mais 2 usos).
- **O que era:** esse commit específico da action é uma versão antiga da `v4` que roda internamente em Node.js 20 — runtime que o GitHub está aposentando nos runners do Actions. O GitHub força a execução em Node 24 mesmo assim, mas emite um warning a cada run.
- **Por que não foi notado:** os 4 usos em `security.yml` já existiam antes da minha sessão (pré-existente). Mas eu **reaproveitei esse mesmo SHA desatualizado** nos meus 2 arquivos novos por "consistência com a convenção já usada no repositório" — sem verificar se ainda era a versão mais atual, ao contrário do que fiz corretamente para as outras actions (configure-pages, upload-pages-artifact, deploy-pages, setup-node), onde consultei a API do GitHub para pegar o SHA vigente de cada uma.
- **Como foi notificado:** o usuário mandou um print da página de Actions do GitHub mostrando o warning na aba "Annotations" e perguntou o que era. Não foi algo que eu vi ou verifiquei proativamente depois de criar os workflows.
- **Teria passado sem o usuário?** Sim — eu não tinha nenhum mecanismo de verificação pós-criação que checasse se os SHAs fixados continuavam atuais ao longo do tempo.
- **Correção:** SHA atualizado para o commit atual da tag `v4` (`11d5960a...`) nos 6 lugares, commit `02a99f0`.

## 8. Falso positivo do semgrep — credencial de exemplo em `anatomia-de-um-harness.md`

- **Onde:** `anatomia-de-um-harness.md`, uma string de exemplo ilustrativo (chave de acesso AWS fake, formato `AKIA` + 16 caracteres alfanuméricos) usada num artigo de documentação.
- **O que era:** essa string batia exatamente no padrão de detecção de chave de acesso da AWS do semgrep, fazendo o job SAST do `security.yml` falhar em toda execução.
- **Por que não foi notado antes de eu investigar:** o arquivo já existia desde o commit inicial `3b42f4d` — de antes de qualquer trabalho meu no TODO app. Só foi investigado porque o print de Actions do usuário mostrava o job "Security" falhando repetidamente, e eu decidi rodar o semgrep localmente para diagnosticar em vez de assumir que era relacionado ao meu código.
- **Como foi notificado:** o usuário perguntou "deu erro na security" mostrando um print da lista de execuções do Actions com vários X vermelhos. Eu investiguei a causa raiz por iniciativa própria depois dessa pergunta, mas só porque a pergunta foi feita — não tinha checado isso antes por conta própria em nenhum momento anterior, mesmo já tendo commitado e feito merge de várias PRs.
- **Teria passado sem o usuário?** Sim, integralmente — nada no meu fluxo normal me levaria a rodar um scan de segurança no repositório inteiro (fora do escopo do que eu estava editando) sem ser solicitado.
- **Correção:** reescrita a frase para descrever o formato da credencial em vez de embutir uma string que bate no padrão, commit `7548c6f`.

## 9. Drift de adapters — `.claude/skills/adr-writer/SKILL.md` desatualizado

- **Onde:** arquivo gerado `.claude/skills/adr-writer/SKILL.md`, fora de sincronia com sua fonte `agents/skills/adr-writer.md`.
- **O que era:** o job "adapters" do `security.yml` roda `scripts/sync-adapters.sh --check`, que compara o arquivo gerado com o que seria gerado a partir da fonte agora — e eles não batiam.
- **Por que não foi notado:** esse drift também já existia desde o commit inicial `3b42f4d`, antes de qualquer trabalho meu. Eu tinha investigado e confirmado isso via `git log`/`git status` na mesma sessão em que investiguei o item 8 — mas só documentei, não corrigi, até o usuário pedir explicitamente.
- **Como foi notificado:** o usuário colou diretamente o log de erro do job do GitHub Actions (linha "drift: ... is out of sync ...") e pediu a correção.
- **Teria passado sem o usuário?** Sim — eu tinha identificado o problema mas só ofereci corrigir "se quisesse", sem tomar a iniciativa de resolver sozinho enquanto não fosse pedido.
- **Correção:** rodado `scripts/sync-adapters.sh` para regenerar o arquivo, commit `9da1d98`.

---

## Conclusão

Os itens 1, 2, 3, 5, 6, 7 e 9 são falhas de **disciplina de processo** do agente — nenhum deles exigia informação que não estava disponível no momento. O item 4 é uma falha estrutural do **método de verificação** (jsdom não renderiza visualmente) combinada, no caso do delete, com uma **decisão de produto não comunicada**. O item 8 é o único genuinamente "impossível de prever sem procurar" — um problema pré-existente e sem relação com o trabalho, só encontrado porque foi investigado por iniciativa própria depois de uma pergunta do usuário.

Um padrão que se repete nos itens 7, 8 e 9: em nenhum dos três o agente verificou proativamente, depois de terminar o trabalho "principal", se o resto do repositório (workflows pré-existentes, convenções já usadas, arquivos gerados) continuava consistente. As três correções só aconteceram porque o usuário colou o log de erro/print do CI e perguntou — nenhuma foi encontrada de forma proativa antes disso. Vale cobrar isso como responsabilidade direta; os itens do grupo 4 apontam para a necessidade de, em builds futuras, incluir alguma forma de inspeção visual real (screenshot, browser real) antes de declarar uma task de UI como concluída.
