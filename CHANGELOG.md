# Histórico

## 0.6.1

- Corrigidas as abas Diário do grupo e Transferências: usam uma ação própria, sem conflito com a ação de abas reservada do Foundry V13.
- Adicionar animal de carga abre o compêndio D20Age · Bestas de carga com camelo, cavalos de guerra, tração e cavalgada, mula e pônei. O compêndio é preparado no primeiro clique e reutilizado nos seguintes, preservando edições.
- Arrastar um animal desse compêndio para o grupo importa sua ficha, vincula o inventário e mantém o perfil de carga do livro.

## 0.6.0 — Ficha de grupo

- Novo tipo de ator Grupo / Companhia, com integrantes vinculados, consulta de PV, CA, TACO, movimento, condições e carga das fichas reais.
- Reserva compartilhada, inventários pessoais e carga de cada animal separados. Transferências de itens inteiros ou quantidades parciais e moedas por denominação, sem duplicar pertences.
- Mula, camelo, cavalos de guerra/tração/cavalgada e pônei seguem capacidade e movimento do LB p.120; animais personalizados têm limites configuráveis. Moedas pesam 1 cn cada, conforme p.64. Cavaleiro e carga adicional entram no cálculo.
- Botão Adicionar mula importa uma ficha do bestiário. Arrastar personagens/criaturas do mundo cria vínculos; itens de fichas vinculadas são transferidos e itens do compêndio são copiados como novos tesouros.
- Fila de transferências no mestre ativo, validação de permissões e capacidade no momento da operação, histórico das últimas 20 movimentações e registro persistente para recuperar interrupções.
- Estética monocromática, bordas hachuradas, contraste explícito nos botões selecionados e diário próprio do grupo.
- Os testes de integração usam um simulador do contrato da API. A execução no cliente licenciado do Foundry V13 ainda precisa ser validada na mesa.

## 0.5.1

- Iniciativa inclui tokens ausentes no rastreador; o mestre pode criar automaticamente um encontro ativo na cena. O resultado é salvo nos combatentes e aparece no chat e abaixo do retrato. Um jogador pode adicionar seu token a um encontro existente, conforme as permissões nativas. Tokens não vinculados são tratados por exemplar; fichas com vários tokens pedem a escolha do token.
- Botões Individual e Grupo ficam sob o retrato nas duas fichas de personagem. Grupo usa os tokens selecionados no mapa. Botões Aventureiros e Criaturas do mestre também incluem os tokens da cena. Nenhuma rolagem de iniciativa é anunciada como registrada quando não há combatente.
- Progressão reorganizada em cartões de XP, DV e PV temporários; bônus de XP aceita ajustes positivos e negativos, e o histórico de PV continua preservado.
- Editor de magias em três etapas: Preparação, Efeitos e Descrição. Círculos e memorizações têm botões; apenas os efeitos selecionados mostram campos. Dano, cura, PV temporários e bônus podem coexistir. Remover um efeito zera apenas os valores dele. Magias existentes mantêm suas fórmulas e descrições.
- Espaços por círculo podem seguir a progressão ou ser editados manualmente. Ao ativar pela primeira vez, os limites da classe são copiados; limites manuais sobrevivem à volta para o automático e à mudança de nível. Conjuração valida os limites escolhidos.
- Memórias restantes no chat têm destaque e números maiores. Abas selecionadas e textos de edição têm contraste explícito. Anotações da aventura ficam em uma aba própria; textos anteriores são preservados.
- Verificação: 136 testes automatizados, prévias no navegador e CRC do ZIP. Execução em instalação licenciada do Foundry V13 permanece pendente.

## 0.5.0

Espaços de memorização; campo Alvo nas magias e remoção dos campos genéricos de salvaguarda/requisitos. Fórmulas de dano, cura e PV temporários, escala por nível/círculo e ajustes removíveis por ActiveEffect. Flecha mágica, Bola de fogo, Mãos flamejantes, Restauração e Armadura mágica preparadas; Heroísmo e proteções têm ajustes e condições explícitas. Aplicação nos alvos exige confirmação e permissão.

Carga discriminada por equipamentos/moedas/adicional e faixa do LB p.64; modificador de XP aceita valores negativos. Avanço de nível confirma os DV e mantém histórico por nível, CON, robustez e ferimentos. Idiomas da classe, tabela d20 para escolher/sortear, alinhamento selecionável e anotações da aventura. Iniciativas individual e por grupo; chat com resultado branco; tokens padrão circulares com a mesma arte.

Bestiário preparado para PV rolados por exemplar. DV fracionários e bônus fixos preservados; hidras e colônias seguem suas regras especiais. Painel privado do mestre com fichas arrastáveis, exemplares numerados, PV próprios, dano, cura, ataques, SV, moral e notas persistentes. Atualização preserva fichas em uso, retratos personalizados e descrições revisadas. 120 testes aprovados e prévias verificadas em navegador; validação no cliente licenciado Foundry V13 ainda pendente.

## 0.4.7

Descrições individuais em todos os compêndios, extração com limites por registro, recuperação de parágrafos incompletos e texto justificado. Perícias Esconder e Idioma separadas; poderes de criaturas delimitados e atribuídos à categoria correta. Tabelas de consulta com textos próprios. Atualização automática dos compêndios existentes e correção de textos antigos em registros importados, preservando escrita personalizada, estatísticas e retratos. 91 testes aprovados; ZIP verificado integralmente.


## 0.1.1

Ficha com molduras desenhadas, textura discreta de papel, hachuras e ilustrações vetoriais próprias de espada, escudo, varinha, livro, bússola, acampamento e mochila. Botões com rótulos maiores, ícones vetoriais, contraste explícito e estados de foco/seleção. Controles do cabeçalho corrigidos para os temas claro e escuro. A prévia independente incorpora todos os SVGs.

## 0.1.0

Estrutura inicial para Foundry V13, modelos de dados, fichas monocromáticas de aventureiro e criatura, itens editáveis, cálculos básicos, rolagens e registro de memorizações. Inclui documentação, testes e prévia visual.
