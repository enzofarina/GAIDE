# Anatomia de um Harness

> GAIDE · leitura do repositório

O que o GAIDE é, e como um harness de agente de código funciona por dentro — do evento que dispara um hook até o exit code que rejeita uma escrita. Leitura feita sobre o repositório real, com as afirmações conferidas no código-fonte.

---

## 1. O conceito: o que é um harness

Para melhorar o resultado de um agente de código, quase sempre se pensa em duas alavancas — modelo melhor ou prompt melhor. Harness engineering é uma terceira: **o ambiente em volta do agente**.

Um harness determina quatro coisas:

| Superfície             | Pergunta que responde                | No GAIDE                                  |
| ----------------------- | ------------------------------------ | ----------------------------------------- |
| **Contexto**      | O que o agente lê antes de agir?    | `AGENTS.md`, `specs/constitution.md`  |
| **Capacidade**    | O que ele consegue fazer?            | `permissions` em `settings.json`, MCP |
| **Enforcement**   | O que acontece quando ele erra?      | hooks →`scripts/`, pre-commit, CI      |
| **Persistência** | O que sobra quando o contexto morre? | `PROGRESS.md`, `specs/`, ADRs         |

### A tese, em uma frase

> "Instructions degrade, mechanisms don't."

Uma regra em prosa — "nunca comite segredos" — é só mais um punhado de tokens competindo por atenção com o código e com a pressão de entregar. Sob contexto longo, o agente esquece ou racionaliza. Um `exit 2` que rejeita a tool call não é negociável.

É a lente para ler o repositório inteiro: cada peça converte uma regra em um mecanismo.

---

## 2. O que o GAIDE é, concretamente

É um **template de projeto**. E tem uma característica que desconcerta na primeira leitura: `src/` é vazio, e `tests/` só tem um README. Não há código de aplicação nenhum.

O `src/README.md` explica: "o conteúdo real emerge das specs, não de código pré-existente". O produto do GAIDE não é software — é a camada de governança em volta do agente que vai escrever o software. Eles chamam de **IADE**, *Integrated Agentive Development Environment*, um trocadilho com IDE.

---

## 3. O mecanismo central: como um hook funciona

Esta é a parte para saber de cor — e a que mais exige vocabulário. Se algum dos termos abaixo for novo, leia a tabela antes de seguir: o resto da seção depende inteiramente dela.

### Vocabulário mínimo

| Termo                 | O que é                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **tool call**   | O agente não mexe em arquivos por conta própria: ele pede.`Write` para criar, `Edit` para alterar, `Bash` para rodar comando, `Read` para ler. Cada pedido desses é uma tool call — e é o único jeito de ele afetar o mundo.                                                                                                          |
| **hook**        | Um "gancho": ponto onde o programa deixa você pendurar código seu, para rodar automaticamente quando algo acontece — como um`onClick` em JavaScript. A diferença aqui é que o hook não só observa: ele pode vetar.                                                                                                                         |
| **PreToolUse**  | O nome de um desses ganchos: o que dispara*antes* de uma ferramenta rodar — por isso consegue cancelar. Os outros dois que o GAIDE usa são `PostToolUse` (depois da ferramenta rodar, para conferir o resultado) e `Stop` (antes de o agente encerrar o turno). Em `.claude/settings.json` você declara qual script roda em qual evento. |
| **arquivo .sh** | Um shell script: arquivo de texto puro com comandos de terminal, executado pelo bash — o mesmo programa onde você digita`cd` e `git commit`. A escolha não é por gosto: shell roda em qualquer máquina Unix sem instalar nada, e é isso que torna as checagens portáteis.                                                                |
| **exit code**   | Todo programa devolve um número ao terminar. Convenção universal:`0` = deu certo, qualquer outro = deu errado. O Claude Code dá um sentido extra ao `2`: *rejeite esta ação e mostre o erro ao agente*. Esse número é, literalmente, o mecanismo inteiro.                                                                             |
| **chave AWS**   | Credencial de acesso à nuvem da Amazon — usuário e senha, mas para máquinas. Começa sempre com`AKIA` seguido de 16 caracteres. É o exemplo canônico de segredo porque robôs varrem o GitHub o dia inteiro atrás desse padrão: chave exposta costuma ser achada em minutos e usada para subir servidores na sua fatura.                  |

### O cenário

O agente tenta escrever um arquivo contendo `AKIA1234567890ABCDEF`. E como o Git guarda todo o histórico, apagar a chave num commit posterior não resolve — ela continua recuperável para sempre. Por isso este portão age **antes** do dano, não depois.

```
Agente pede: Write
o conteúdo contém uma chave AWS
          │
          ▼
Evento PreToolUse dispara
antes de a escrita acontecer
          │  os dados do pedido, em JSON
          ▼
block-secrets.sh — o adaptador
desembrulha o JSON e pega o texto
          │  só o texto a ser escrito
          ▼
check-secrets.sh — a checagem
procura 7 padrões de segredo
          │
    ┌─────┴─────────────────────┐
    ▼                           ▼
não achou → exit 0        achou → exit 2
a escrita acontece        escrita CANCELADA · o erro
normalmente               volta ao agente, que corrige
```

O exit code é o protocolo. Não há negociação nem persuasão: o `2` cancela o pedido antes de ele acontecer, e a mensagem de erro vira contexto para o agente se corrigir. O arquivo nunca chegou a existir. Nenhuma instrução foi obedecida — uma ação foi impedida.

### Por que são dois arquivos, e não um

Reparou que a checagem está partida em dois? Isso se repete em todo o repositório, e é a decisão de projeto mais importante do GAIDE.

```
.claude/hooks/block-secrets.sh   ← adaptador · ~8 linhas · sabe o que é Claude Code
      |
scripts/check-secrets.sh         ← a checagem · shell puro · não sabe que agente existe
```

A analogia: a checagem é o aparelho; o adaptador é o adaptador de tomada. Mudou de país — isto é, de ferramenta — troca-se o adaptador, e o aparelho continua o mesmo. É por isso que você consegue rodar a checagem na mão, sem agente nenhum:

```bash
cat meu_arquivo.py | ./scripts/check-secrets.sh
```

### Um detalhe elegante

A checagem tem um regex de placeholder — `YOUR_`, `EXAMPLE`, `CHANGE_ME` — que deixa passar de propósito. Sem ele seria impossível escrever um arquivo `.env.example`, que é justamente como se documenta quais credenciais um projeto precisa sem expor nenhuma delas.

---

## 4. As três profundidades de defesa

Provavelmente o insight de design mais importante do repositório, e o que gera o trade-off mais interessante para pesquisa.

| Momento                  | Mecanismo                         | Cobertura                              | Custo do conserto |
| ------------------------ | --------------------------------- | -------------------------------------- | ----------------- |
| No instante da tool call | hooks inline ·`.claude/hooks/` | só Claude Code                        | segundos          |
| No git commit            | pre-commit · gitleaks + semgrep  | todo humano e agente na máquina local | minutos           |
| No push / PR             | CI · GitHub Actions              | todo mundo — ninguém consegue pular  | um ciclo inteiro  |

A tensão é inerente. Quanto mais cedo o portão, mais barato o conserto e menor a cobertura; quanto mais tarde, mais universal e mais caro. O enforcement inline só existe onde a ferramenta tem eventos de hook — hoje, Claude Code. A limitação de cobertura do harness é, na prática, uma limitação de ferramenta.

---

## 5. A constitution, e os dois princípios que importam

São dez princípios em `specs/constitution.md`. Oito são boas práticas conhecidas — spec antes de código, testes acompanham comportamento, ADR para decisões, aprovação humana antes do commit. Os princípios 9 e 10 são os incomuns, e são a razão de existir do resto do harness.

**Princípio 9 — testes e listas de tarefas são estruturais.** Proibido apagar ou enfraquecer um teste, ou re-marcar uma tarefa, para fazer o trabalho parecer pronto.

**Princípio 10 — achados de segurança são estruturais.** Proibido suprimir achado de scanner (`# nosemgrep`, ignore files, baixar threshold) para fazer a checagem passar.

O "porquê" do princípio 9 cita diretamente a pesquisa da Anthropic sobre agentes de longa duração: sob pressão de mostrar progresso, o agente edita o teste em vez do código. Isso é *specification gaming* aplicado a engenharia de software — o agente otimiza o sinal observável (suíte verde) em vez do objetivo real (código correto).

E aqui está o fecho lógico do projeto inteiro: se o teste pode ser silenciosamente reescrito, todos os outros princípios perdem a âncora. Por isso o resto do harness existe — para tornar 9 e 10 verificáveis em vez de apenas declarados.

---

## 6. Os outros mecanismos

**`done` não é `verified`.** O ciclo de status em `specs/template/tasks.md` é `pending → in-progress → done → verified`, e a distinção é precisa: *done* = implementado e os testes dele passam; *verified* = conferido contra os critérios da spec por alguém que não implementou. A skill `verifier` é o único caminho para *verified*, e exige exercitar a aplicação rodando, não ler código. "Os testes passam" não é "a feature funciona": testes verificam o que o implementador lembrou de testar.

**Revisão em contexto limpo.** A skill `code-reviewer` não revisa — ela orquestra. Dispara um subagente de contexto zerado que recebe só o diff e os caminhos dos documentos, e instrui explicitamente a não passar resumo da implementação nem justificativas. A razão é cirúrgica: "o contexto que escreveu o código contém as racionalizações que produziram os bugs". É a correção do problema clássico de pedir ao agente que revise o próprio código — ele concorda consigo mesmo. Detalhe fino: se o revisor precisa do contexto do autor para entender o código, isso é um achado, não uma lacuna a preencher.

**Bootstrap e log de sessão.** `init.sh` roda no início: dependências, suíte verde, app respondendo. Falha ali significa que você herdou estado quebrado — conserte antes de começar. `PROGRESS.md` recebe uma entrada ao fim. Combate o modo de falha "toda sessão começa cega": a janela de contexto morre, artefatos em disco não.

**Deny permissions.** Em `.claude/settings.json`, uma lista negativa que impede o agente de sequer ler `.env`, `*.pem`, `~/.ssh/**`, `~/.aws/**`, e de rodar `git push --force`, `git reset --hard` ou pipar download para shell.

---

## 7. Portabilidade: política versus binding

O repositório separa duas coisas que normalmente vêm grudadas.

```
FONTE ÚNICA · portátil
Política
  AGENTS.md
  agents/skills/
  scripts/
  specs/ · docs/adr/
  Markdown + shell POSIX
          │
          │  sync-adapters.sh  ← gera os bindings
          │
    ┌─────┴─────┐
    ▼           ▼
.claude/     .agents/
Claude Code  Antigravity
tem hooks    sem hooks

drift check na CI
editou o gerado em vez da fonte? o build quebra
```

Só o caminho muda, porque só o lugar onde cada ferramenta olha muda. A mesma skill vive em três arquivos, e o diff entre a fonte e o gerado são duas linhas de comentário. Sem o drift check, a política divergiria silenciosamente entre ferramentas.

Detalhe importante: `AGENTS.md` é um padrão aberto já lido nativamente por Cursor, Codex, Zed, Copilot e Gemini CLI. Então "sem binding nenhum" é uma configuração válida — você perde enforcement inline e mantém briefing e skills.

---

## 8. O feature model que te mandaram

Com a lente certa, o HTML deixa de ser documentação: é um **feature model** no sentido de Linha de Produto de Software. A notação é a clássica do FODA — círculo cheio para obrigatório, vazio para opcional, arco cheio para grupo OR (o caso de *Binding*: Claude Code, Antigravity, ambos ou nenhum) e arco vazio para grupo XOR (o caso de *Autonomia*: HIC, HOTL ou HOOTL, exatamente um).

E ele faz uma coisa que feature model normalmente não faz. Tem dois modos: **Estrutura**, a variabilidade, e **Estado atual**, uma auditoria empírica daquela instalação. Sobrepor um audit de execução a um modelo de variabilidade é incomum — e eu apostaria que é aí que está o interesse de pesquisa, porque produziu uma categoria de estado que não existe em SPL clássico.

### "Instalado, mas não detecta"

É o estado do portão de fim de turno, e o achado mais sério do levantamento. Um portão inerte é um risco conhecido; um portão que responde "tudo limpo" sem ter olhado é um risco invisível.

Conferi no código-fonte e procede, por duas razões independentes. O script só bloqueia quando o exit é exatamente `1` — qualquer outro código, incluindo o aborto que o aviso de CRLF do Git provoca no Windows, passa como sucesso. E `gitleaks protect` só olha o diff de arquivos já rastreados, então segredo em arquivo novo passa direto mesmo sem o CRLF.

O comentário do próprio script documenta a escolha — bloqueia em achado, nunca em erro de ferramenta — que é defensável em intenção e produz o falso negativo na prática. Isso é o trade-off *fail open* versus *fail closed* aplicado a harness. É material de artigo, não descuido.

---

## 9. Por onde a pesquisa entra

*Marcando como leitura minha, não fato — vale confirmar com seu orientador.*

O GAIDE é um harness concreto e completo, com variabilidade real: dois bindings, três modos de autonomia, três profundidades de enforcement, features opcionais que dependem de ferramentas externas. O feature model transforma isso num espaço de configuração explícito. As perguntas que caem naturalmente daí:

1. **Quais features de harness são de fato estruturais, e quais são over-scaffolding?** A própria constitution levanta isso na nota de expiração — over-scaffolding segura modelo bom — mas ninguém mediu.
2. **Como medir a eficácia de um harness?** O repositório admite que nenhum ciclo completo foi rodado nele. Não há evidência empírica ainda.
3. **Qual o custo real de portabilidade entre ferramentas agentivas**, e o que exatamente se perde?
4. **Feature models dão conta de variabilidade de ambiente?** Boa parte dos estados "não funciona" vem de ambiente — `python3` ausente, semgrep sem suporte no Windows, MCP desconectado — e não de escolha de projeto, que é o que o FODA modela.

---

*Leitura feita sobre o repositório `jcarlos78/GAIDE` em setembro de 2026, com as afirmações do feature model conferidas contra o código-fonte. As citações de linha (`.mcp.json:31`, `check-clean-state.sh:15-16`) foram verificadas e batem.*

*Documento companheiro: **Trilha Harness Engineering**, o plano de estudo de 16 semanas.*
