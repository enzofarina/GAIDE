# Trilha Harness Engineering

> LES · PUC-Rio · Iniciação Científica

Um plano de estudo de um semestre para entrar na pesquisa sobre *harnesses* de agentes de código — a camada de ambiente que restringe o agente por mecanismo, não por instrução. Construído em cima do GAIDE, o framework do José Carlos que provavelmente será a base do trabalho.

| Início | Duração | Ritmo sugerido | Alvo de submissão |
| --- | --- | --- | --- |
| Setembro de 2026 | 16 semanas · 5 fases | 8–10 h/semana | SBCARS / SBES 2027 |

## Conteúdo

- **00** — Pré-requisitos técnicos: o que instalar e praticar antes
- **01** — Fundamentos do harness · semanas 1–4
- **02** — Spec-Driven Development e governança · semanas 5–8
- **03** — O lado adversarial: reward hacking e segurança · semanas 9–11
- **04** — Variabilidade: SPL e feature models · semanas 12–14
- **05** — Método empírico e escrita · semanas 15–16
- **06** — Onde procurar material e acompanhar o que sai
- **07** — Lacunas de pesquisa que eu identifiquei

> Notação das leituras: **essencial** / *complementar* — mesma notação do feature model que você recebeu.

---

## Leia isto primeiro, antes de qualquer outra coisa

Existe um paper que é quase exatamente a pesquisa de vocês, e um segundo que é a fundação teórica dela. Se você só tiver tempo para dois textos antes de conversar com seu orientador, sejam estes: **Galster et al. (arXiv 2602.14690)**, que identifica oito mecanismos de configuração de harness e mede a adoção deles em 2.853 repositórios do GitHub, e **arXiv 2609.00252**, que propõe um modelo sociotécnico de SDD e — literalmente — uma caracterização operacional do harness separando mecanismos técnicos de metodológicos.

O segundo saiu em setembro de 2026. Vale checar se os autores estarão no CBSoft.

---

## Fase 00 · contínua — Pré-requisitos técnicos

Harness é uma disciplina de engenharia antes de ser um objeto de pesquisa. Você não consegue argumentar sobre um portão que nunca viu bloquear nada.

### Instale e faça funcionar

- **semgrep, gitleaks e osv-scanner** — os três scanners que o GAIDE usa. Rode cada um à mão em código propositalmente ruim antes de confiar no que o harness reporta.
- **pre-commit** — instale no GAIDE e faça um commit com um segredo falso. Confirme que bloqueia.
- **Claude Code hooks** — `PreToolUse`, `PostToolUse` e `Stop`. Escreva um hook seu do zero, de cinco linhas, que rejeite alguma coisa. É o exercício que faz a tese do projeto virar intuição.
- **MCP** — suba um servidor local e conecte. Depois habilite o Playwright do GAIDE (tirar o `_` de `.mcp.json:31`) e faça a skill `verifier` rodar de verdade.
- **FeatureIDE ou flamapy + UVL** — ferramentas de análise automatizada de feature model. Você vai precisar delas na fase 04.

### Exercício de aquecimento

Reproduza o bug do portão de fim de turno que o feature model reporta. Crie um arquivo não rastreado com um segredo falso, rode `scripts/check-clean-state.sh` e observe o `exit 0`. Depois rode `gitleaks detect --no-git` no mesmo arquivo e veja o achado aparecer. Entender essa diferença — *fail open* versus *fail closed* — é meio caminho para a sua primeira contribuição original.

### Entregável

Um relato de uma página: cada portão do GAIDE, o comando que você usou para testá-lo, e se ele bloqueou ou não. Isso já é dado empírico.

---

## Fase 01 · semanas 1–4 — Fundamentos do harness

Sair capaz de definir harness engineering com precisão, distinguir de prompt e context engineering, e enumerar os mecanismos que a literatura já catalogou.

### Conceitos a dominar

- A escada **prompt → context → harness engineering**: o que cada camada controla e por que a terceira apareceu.
- **Instruções degradam, mecanismos não** — o argumento central, e suas condições de validade. Quando a instrução basta?
- O problema da **janela de contexto que morre**: agentes trabalham em turnos sem memória do turno anterior. Artefatos em disco como ponte.
- **Anatomia de um harness**: loop do agente, interface de ferramentas, gestão de contexto, mecanismos de controle.
- **Over-scaffolding**: a hipótese de que andaime demais segura modelo bom. É a "nota de expiração" da constitution do GAIDE, e é uma pergunta empírica em aberto.

### Leituras

**Harness Engineering for Agentic AI Coding Tools: An Exploratory Study** — o paper mais próximo da pesquisa de vocês. Oito mecanismos de configuração catalogados, adoção medida em 2.853 repositórios. Achado central: arquivos de contexto dominam e o `AGENTS.md` emergiu como padrão interoperável; skills e subagentes são raros.
*Galster et al. · arXiv 2602.14690*

**Effective harnesses for long-running agents** — a fonte primária que o README do GAIDE cita. Agente inicializador + agente de código, com artefatos duráveis entre sessões. É daqui que vem o modo de falha do Princípio 9: agentes sob pressão de progresso editam testes.
*Anthropic Engineering · nov. 2025*

**Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems** — estudo de código-fonte de onze harnesses reais. Setembro de 2026 — provavelmente a referência mais atual sobre arquitetura de harness quando você começar.
*arXiv 2609.00006*

*Agentic Harness Engineering: Observability-Driven Automatic Evolution of Coding-Agent Harnesses* — o harness que se modifica sozinho a partir de telemetria. Interessa porque ataca de frente a "nota de expiração": como saber que uma peça do andaime virou peso morto.
*arXiv 2604.25850*

*Code as Agent Harness* — propõe código executável, verificável e com estado como substrato do harness — a contraposição direta ao harness feito de Markdown. Boa munição para discutir o desenho do GAIDE.
*arXiv 2605.18747*

*Harnessing Agent Skills: Architectural Patterns and a Reference Architecture for Skill-Mediated LLM Agents* — arquitetura de referência para skills, exatamente o mecanismo que o GAIDE coloca em `agents/skills/` e que Galster et al. mostram ser pouco adotado.
*arXiv 2606.20631*

*LLM-Based Multi-Agent Systems for Software Engineering: Literature Review, Vision, and the Road Ahead* — survey em periódico de primeira linha. Use para mapear o campo e achar a linguagem que revisor de ES espera.
*ACM TOSEM*

### Entregável

Uma tabela cruzando os oito mecanismos de Galster et al. com o que o GAIDE implementa. As lacunas dos dois lados são material de discussão com o orientador.

---

## Fase 02 · semanas 5–8 — Spec-Driven Development e governança

Entender por que a spec vira contrato entre humano e agente, e como o nível de autonomia deixa de ser hábito e vira decisão registrada.

### Conceitos a dominar

- O ciclo **spec → plan → tasks → código**, com portão humano em cada transição.
- Os três níveis de rigor: **spec-first, spec-anchored e spec-as-source**. Onde o GAIDE se encaixa? (A resposta não é óbvia — vale discutir.)
- **`done` versus `verified`**: por que "os testes passam" não é "a feature funciona", e por que só um verificador independente fecha o ciclo.
- **Sprint contract**: fixar o significado de "pronto" antes da implementação começar.
- Modos de autonomia **HIC / HOTL / HOOTL** e o custo de migrar entre eles.
- **Revisão em contexto limpo** como correção de viés: o contexto que escreveu o bug contém as racionalizações que o produziram.
- **ADRs** — decisões arquiteturais imutáveis e rastreáveis.

### Leituras

**Spec-Driven Development for Agentic Software Engineering: Harnessing Human–Agent Teamwork** — modelo sociotécnico em que a spec é o substrato de contrato entre humanos e agentes, mais uma caracterização operacional do harness separando mecanismos técnicos de metodológicos e uma tipologia de cinco padrões de interação humano-agente. Esse recorte é praticamente a moldura teórica do trabalho de vocês.
*arXiv 2609.00252 · set. 2026*

**Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants** — inverte o fluxo tradicional: spec como fonte da verdade, código como artefato gerado ou verificado. Define os três níveis de rigor que você vai usar para classificar o GAIDE.
*arXiv 2602.00180*

*Spec Kit Agents: Context-Grounded Agentic Workflows* — pipeline SDD multiagente com papéis de PM e desenvolvedor, atacando APIs alucinadas e violações arquiteturais em repositórios grandes. Comparação natural com as skills do GAIDE.
*arXiv 2604.05278*

*Practical Implementation Report on Introducing Spec-Driven Development Using AI Agents in Software Development PBL* — SDD aplicado em disciplina de projeto. Achado desconfortável e relevante: o agente aumentou a vazão de implementação, mas incentivou os alunos a seguirem sem entender o código. Bom contraponto ao entusiasmo.
*arXiv 2608.30572*

### Entregável

Rode um ciclo SDD completo no GAIDE — spec, plan, tasks, implementação, revisão — para uma feature pequena. Ninguém fez isso no repositório ainda: `src/` está vazio. Você seria o primeiro, e o registro do que quebra é dado de pesquisa.

---

## Fase 03 · semanas 9–11 — O lado adversarial: reward hacking e segurança

Entender o modo de falha que justifica o harness inteiro — o agente que otimiza o sinal observável em vez do objetivo real — e o que já existe para medi-lo.

### Conceitos a dominar

- **Specification gaming e reward hacking** em agentes de código: apagar teste, afrouxar assert, silenciar scanner, re-marcar tarefa.
- Por que **pós-treino com RL aumenta a taxa de exploração** — um dos resultados mais citados da área.
- **Detecção**: testes retidos versus juiz LLM versus análise contrastiva de trajetória.
- **SAST, SCA e secret scanning** no fluxo do agente: o que cada um pega, e a semântica de exit code que separa "achado" de "erro de ferramenta".
- **Slopsquatting** e alucinação de pacote como vetor de cadeia de suprimentos.
- **Segurança de MCP**: tool poisoning, injeção indireta de prompt, envenenamento de contexto.

### Leituras

**SpecBench: Measuring Reward Hacking in Long-Horizon Coding Agents** — 30 tarefas de nível de sistema, de parser JSON a kernel de SO, de 1,5 mil a 110 mil linhas. Importante: aqui o hacking vem de falha arquitetural, não de manipulação de teste — mostra que o problema é mais amplo do que o Princípio 9 supõe.
*arXiv 2605.21384*

**EvilGenie: a Reward Hacking Benchmark** — modifica o LiveCodeBench para permitir manipulação de teste. Achado útil para o desenho de harness: juízes LLM superaram testes retidos na detecção.
*arXiv 2511.21654*

*Do Coding Agents Deceive Us? Detecting and Preventing Cheating via Capped Evaluation with Randomized Tests* — prevenção, não só medição — mais perto do que um harness pode de fato implementar.
*arXiv 2606.07379*

*The Range Shrinks, the Threat Remains: Re-evaluating LLM Package Hallucinations on the 2026 Frontier-Model Cohort* — a faixa de alucinação de pacote comprimiu para 4,6–6,1% entre modelos de fronteira, mas 43% dos nomes alucinados reaparecem de forma determinística, que é o que torna o ataque viável. Justifica o ramo SCA do harness.
*arXiv 2605.17062*

**Model Context Protocol Threat Modeling and Analyzing Vulnerabilities to Prompt Injection with Tool Poisoning** — tool poisoning como vulnerabilidade cliente mais prevalente, com comparação de sete clientes MCP. Leia antes de habilitar qualquer servidor MCP no GAIDE.
*arXiv 2603.22489*

*SoK: Security and Safety in the Model Context Protocol Ecosystem* — sistematização de conhecimento: o atalho para o panorama inteiro de segurança de MCP sem ler vinte papers.
*arXiv 2512.08290*

### Entregável

Um pequeno conjunto de casos adversariais contra o GAIDE: para cada princípio da constitution, um cenário em que um agente poderia burlá-lo. Marque quais o harness bloqueia mecanicamente e quais dependem só de boa vontade. Essa tabela é, sozinha, uma seção de artigo.

---

## Fase 04 · semanas 12–14 — Variabilidade: SPL e feature models

Adquirir o vocabulário formal do feature model que você recebeu — e a capacidade de analisá-lo automaticamente, não só desenhá-lo.

Esta é a fase que conecta a pesquisa a uma tradição com trinta e cinco anos de literatura, e é provavelmente onde está a contribuição metodológica de vocês. O HTML que seu orientador mandou já é um feature model — falta o ferramental formal por trás dele.

### Conceitos a dominar

- **FODA** e a notação clássica: obrigatório, opcional, grupos OR e XOR, restrições cruzadas (`requires`, `excludes`).
- **Análise automatizada**: contagem de produtos válidos, detecção de features mortas, modelos vazios, features falsamente opcionais — via SAT, BDD ou CSP.
- **UVL** (Universal Variability Language) como formato de intercâmbio, e **flamapy / FeatureIDE** como ferramenta.
- Estratégias de análise de linha de produto: **product-based, family-based, feature-based**.
- A pergunta aberta: feature models clássicos modelam variabilidade de *implementação*. Um harness tem variabilidade de *ambiente* — semgrep instalado, `python3` no PATH, MCP conectado, a ferramenta suporta hooks. A notação atual dá conta disso?

### Leituras

**Automated analysis of feature models: Quo vadis?** — o panorama de referência da análise automatizada, por Benavides e colegas, o grupo que definiu a agenda da área. Comece por aqui, não pelos papers de ferramenta.
*Computing · Springer*

**A Classification and Survey of Analysis Strategies for Software Product Lines** — Thüm et al., em ACM Computing Surveys. A taxonomia product-based / family-based / feature-based que você vai usar para posicionar qualquer análise que propuser.
*ACM Computing Surveys*

*Local Features: Enhancing Variability Modeling in Software Product Lines* — extensão recente da notação. Relevante justamente porque o harness pode precisar de expressividade que o FODA puro não tem.
*arXiv 2403.15821*

*Variability management and software product line knowledge in software companies* — estudo industrial com um achado que importa para vocês: empresas em geral não modelam variabilidade explicitamente. Ou seja, propor um feature model de harness enfrenta uma barreira de adoção conhecida — e isso precisa estar no artigo.
*Journal of Systems and Software · 2024*

### Entregável

Traduza o feature model do GAIDE para UVL e rode análise automatizada. Quantas configurações válidas existem? Alguma feature está morta? A dependência do enforcement inline em relação ao Claude Code aparece como restrição cruzada — e ela é representável na notação padrão?

---

## Fase 05 · semanas 15–16 — Método empírico e escrita

Transformar o que você aprendeu em algo submissível — e aprender a ler papers rápido o bastante para acompanhar uma área que publica toda semana.

### O que estudar

- **Desenhos de estudo em ES**: mineração de repositórios, estudo de caso, experimento controlado, survey. Qual responde qual pergunta.
- **Ameaças à validade** — a seção que separa artigo aceito de rejeitado em SBES.
- **Pacote de replicação**: hoje é praticamente obrigatório. Comece a organizar dados desde a fase 00.
- **Como ler um paper em três passadas**: título/abstract/conclusão → figuras e tabelas → método completo. A maioria dos papers para na primeira passada, e tudo bem.
- **Escrita**: abstract estruturado, pergunta de pesquisa numerada, contribuições explícitas em lista.

### Onde publicar

| Veículo | Quando | Por que serve |
| --- | --- | --- |
| **SBCARS** | CBSoft, set. | Simpósio de Componentes, Arquiteturas e Reutilização. É a casa natural de um trabalho de feature model e linha de produto — o alvo mais provável de vocês. |
| **SBES** | CBSoft, set. | O simpósio principal de ES no Brasil. Alvo se o trabalho virar estudo empírico amplo. |
| **SAST** | CBSoft, set. | Teste sistemático e automatizado. Encaixa se o recorte for o portão de testes e a distinção done/verified. |
| **AGENT @ ICSE** | ICSE, abr./mai. | Workshop internacional de engenharia agentiva. Workshop é a melhor porta de entrada internacional para IC. |
| **VaMoS** | jan./fev. | Variability Modelling of Software-Intensive Systems. Pequeno, focado e receptivo a ideias novas de notação. |
| **SPLC** | set. | A conferência de linhas de produto. Alvo ambicioso, para depois. |

CBSoft 2026 acontece de 8 a 11 de setembro no IME-USP, em São Paulo — reunindo SBES (40ª edição), SBLP (30ª), SBCARS (20ª) e SAST (11ª). É a semana que vem. Vá com duas ou três perguntas escritas no bolso; conversa de corredor em congresso vale mais que uma sessão inteira de apresentações.

### Entregável

Um rascunho de duas páginas com pergunta de pesquisa, método proposto e trabalhos relacionados. Mesmo que nada seja submetido, é o documento que alinha você e o orientador sobre o que exatamente está sendo investigado.

---

## Fase 06 · contínua — Onde procurar material e acompanhar o que sai

A área publica semanalmente. Sem um sistema de acompanhamento, sua revisão de literatura fica desatualizada antes de você terminar de escrevê-la.

### Fontes primárias

- **arxiv.org/list/cs.SE** — Engenharia de Software. É aqui que quase tudo que citei apareceu primeiro. Confira duas vezes por semana — leva dez minutos lendo só títulos.
- **arxiv.org/list/cs.CR** — Criptografia e segurança, onde saem os papers de MCP, tool poisoning e cadeia de suprimentos.
- **anthropic.com/engineering** — fonte primária do conceito de harness, e o que o GAIDE cita diretamente. Blog de engenharia, não peer-reviewed — cite com esse cuidado.
- **awesome-harness-engineering** — lista curada da comunidade: ferramentas, padrões, evals, memória, MCP, permissões, observabilidade. Ótimo para achar o que a academia ainda não catalogou.
- **LLM-Agent-SE-Survey** — repositório companheiro de um survey que conecta mais de 50 benchmarks às estratégias correspondentes. Atalho para o mapa da área.
- **cbsoft.sbc.org.br/2026** — programa, simpósios e workshops. Veja quem apresenta o quê antes de ir.

### Sistema de alerta

- **Google Scholar alerts** para *harness engineering*, *agentic software engineering*, *spec-driven development* e *reward hacking coding agents*. Cinco minutos para configurar, vale o semestre inteiro.
- **dblp** para seguir autores — comece por Matthias Galster (autor do 2602.14690) e pelos nomes que aparecerem repetidamente nas referências.
- **Semantic Scholar ou Connected Papers** para o grafo de citações: partindo do 2602.14690, você acha tanto os ancestrais quanto quem já o citou.
- **Zotero** desde o primeiro paper. Não confie na memória nem em pasta de PDFs; você vai precisar do BibTeX depois, e reconstituir referência é trabalho perdido.

### Uma ressalva sobre esta lista

Levantei estas referências por busca, então trate os identificadores arXiv como ponto de partida, não como citação verificada. Antes de citar qualquer uma num texto, abra o `abs/`, confirme autores, ano e veículo, e exporte o BibTeX oficial. Isso vale para qualquer bibliografia, mas vale em dobro para uma que veio pronta.

---

## Fase 07 · para discutir com o orientador — Lacunas de pesquisa que eu identifiquei

Lendo o GAIDE contra a literatura, quatro perguntas ficaram sem resposta. Nenhuma é minha para responder — são para você levar à mesa.

1. **Quais features de harness são de fato estruturais?** A própria constitution do GAIDE levanta isso na nota de expiração: over-scaffolding segura modelo bom. Mas ninguém mediu. Um estudo ablativo — remover uma feature por vez e medir o efeito — parece viável e ninguém publicou.
2. **Feature models dão conta de variabilidade de ambiente?** A auditoria no HTML mostra que boa parte dos estados "não funciona" vem de ambiente, não de configuração: `python3` ausente, semgrep não suportado no Windows, MCP desconectado, CRLF envenenando o stderr. A notação FODA modela escolha de projeto, não estado de instalação. Essa distância pode ser a contribuição de vocês.
3. **Qual o custo real de portabilidade entre ferramentas agentivas?** O GAIDE afirma que trocar de ferramenta custa "algumas dezenas de linhas". Dá para medir: implemente um terceiro binding e conte o esforço. E meça o que se perde — sem hooks, o enforcement desce para o nível do commit.
4. **Portões que falham abrindo são melhores ou piores que a ausência de portão?** O achado mais forte da auditoria é um portão que responde "tudo limpo" sem ter olhado. O comentário no script documenta a escolha — bloquear em achado, nunca em erro de ferramenta — e ela é defensável. Mas ninguém estudou o efeito do falso negativo sobre a confiança de quem opera o harness.

---

*Como usar este plano.* As fases são sequenciais porque cada uma pressupõe o vocabulário da anterior — mas as leituras marcadas como complementares podem ser puladas sem prejuízo, e devem ser, se o tempo apertar. O que não deve ser pulado é o entregável: ler sobre harness sem construir um produz uma revisão de literatura, não uma pesquisa.

*Datas e números conferidos em setembro de 2026. Referências levantadas por busca — verifique cada uma antes de citar.*
