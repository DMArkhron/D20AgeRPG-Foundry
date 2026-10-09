## Versão 0.6.1 — Correções da ficha de grupo

As abas **Diário do grupo** e **Transferências** agora usam navegação própria, corrigindo o conflito com o Foundry. **Adicionar animal de carga** abre o compêndio **D20Age · Bestas de carga**, preparado no primeiro clique. Escolha entre os seis animais domésticos do livro e arraste a ficha do compêndio para o grupo; ela será importada no mundo e vinculada, com capacidade pronta. O compêndio permanece disponível na aba Compêndios. Substitua a pasta do sistema pela versão 0.6.1 e reinicie o mundo.

## Versão 0.6.0 — Companhia e animais de carga

Na lista de atores, o mestre encontra **Criar grupo**. Também é possível criar um ator do tipo **Grupo / Companhia**. O botão oferece acesso compartilhado aos jogadores; ajuste quem pode editar em **Configurar propriedade**. Não há migração destrutiva dos personagens ou compêndios existentes.

Use **Vincular ficha** ou arraste personagens e criaturas do mundo. Um vínculo aponta para a ficha original: alterações de PV e inventário aparecem no grupo. Ao vincular pelo diálogo, o mestre pode conceder acesso de Observador aos donos do grupo para consulta; o vínculo por arraste concede essa consulta. Desvincular nunca apaga a ficha nem seus pertences; permissões de Observador já concedidas permanecem até o mestre alterá-las.

A **Reserva do grupo** contém os tesouros ainda não atribuídos a um carregador; não é uma bolsa sem limite que acompanha automaticamente a expedição. Use **Transferir** para definir o que cada personagem ou animal leva. O inventário pessoal permanece na ficha do personagem; o inventário do animal permanece na ficha da criatura. Cada moeda pesa 1 cn, independentemente da denominação. Transferências conferem quantidade e capacidade novamente ao confirmar. Itens equipados chegam ao destino desequipados.

**Adicionar mula** cria uma ficha do bestiário e já configura o perfil de 4.000 cn, mantendo MV 30 pés. **Capacidade** permite escolher os seis animais domésticos do LB p.120 ou definir um perfil personalizado. Nos demais perfis, a carga entre o limite normal e o máximo reduz o movimento à metade. Acima do máximo, novas entradas são recusadas; sobrecargas causadas por alterações diretas em outras fichas são sinalizadas, sem apagar itens. Todo item físico no inventário do animal conta, mesmo se a opção Carregado estiver desmarcada. Acrescente o peso do cavaleiro em **Carga adicional**; selas e alforjes registrados como itens não devem ser somados novamente.

Jogadores donos do grupo podem movimentar a reserva, os animais autorizados pelo mestre e seus próprios personagens. Não podem retirar itens de outro personagem sem propriedade da ficha. Para sincronizar jogadores e evitar retiradas simultâneas do mesmo tesouro, **um mestre deve estar conectado**. Não é necessário aprovar cada transferência. Se uma operação for interrompida, o grupo bloqueia novas movimentações e o mestre pode usar **Recuperar transferência** para restaurar os pertences à origem. Caso alguém tenha alterado os saldos após a interrupção, a recuperação não os sobrescreve: confira o registro em `flags.d20age.partyTransaction` e as fichas antes de corrigir os valores. Não repita uma operação após timeout sem consultar o histórico.

Ao vincular um animal, seus novos tokens passam a usar a ficha vinculada. Tokens independentes já colocados no mapa não são alterados: recrie-os a partir da ficha vinculada quando quiser sincronizar PV e pertences. Ataques naturais do animal, como patas e mordidas do bestiário, não são apresentados como equipamentos transferíveis.

Há abas para **Inventário & transporte**, **Diário do grupo** e **Transferências**. O histórico guarda as últimas 20 transferências concluídas. A prévia HTML usa dados demonstrativos e não salva alterações no Foundry.

Para atualizar, feche o Foundry, faça backup do mundo e substitua `Data/systems/d20age` pela pasta `d20age` do ZIP 0.6.0. Reabra o mundo como mestre. Testes automatizados e prévia de navegador não substituem a validação na instalação licenciada do Foundry V13.

## Versão 0.5.1 — Iniciativa e ficha mais intuitiva

**Individual** e **Grupo** ficam abaixo do retrato. Coloque o personagem no mapa; Individual inclui seu token no rastreador e registra a rolagem. Para Grupo, selecione os tokens desejados: todos recebem o mesmo resultado. Tokens já incluídos não são duplicados. Se a ficha representa vários tokens, escolha o exemplar. A ficha do token não vinculado afeta apenas aquele exemplar.

O mestre pode criar um encontro ativo automaticamente ao rolar. Jogadores precisam de um encontro aberto pelo mestre; podem incluir seus próprios tokens conforme as permissões nativas. Aventureiros e Criaturas no rastreador incluem os tokens da cena correspondentes. A iniciativa aparece no rastreador, no chat e sob o retrato. Sem token ou combatente, a ação orienta a inclusão e não publica uma rolagem sem registro.

Na aba **Magia**, use **Editar limites** para ajustar os espaços dos seis círculos. O primeiro uso copia a progressão atual. **Usar progressão da classe** volta ao cálculo automático sem apagar os limites manuais. A preparação acima do limite aparece sinalizada e impede conjuração até ser ajustada. Quantidades memorizadas e consumidas ficam no registro de cada magia.

O editor da magia tem **Preparação**, **Efeitos** e **Descrição**. Escolha círculos por botões, ajuste memorizações com +/− e ative somente os efeitos necessários. Há dano, cura, PV temporários, CA, salvaguardas, PV máximos, acerto e bônus de dano; mais de um pode ficar ativo. Clique novamente para remover um efeito e zerar seus valores. Condições, duração e regras especiais continuam sendo conferidas pela mesa. Magias existentes não perdem fórmulas ao atualizar.

**Progressão e dados de vida** separa experiência, DV e proteção temporária em cartões. O botão de subir nível continua confirmando o DV e guardando o histórico. **Personagem** reúne história, idiomas e treinamento. **Aventura** contém o diário com as anotações anteriores, sem migração destrutiva. Abas selecionadas têm texto branco; memorizações restantes no chat têm destaque maior.

Para atualizar, feche o Foundry, substitua a pasta `Data/systems/d20age` pela pasta do ZIP 0.5.1 e reabra o mundo. Os novos campos recebem padrões automaticamente. As revisões de descrições e dados do compêndio não foram alteradas nesta atualização.

Verificação: **136 testes automatizados**, interação e contraste das prévias no navegador e integridade CRC do ZIP. O contrato da API é testado com um simulador; a execução no cliente licenciado do Foundry V13 permanece pendente.

## Versão 0.5.0 — Progressão, magias e encontros

Para atualizar, feche o mundo, substitua `Data/systems/d20age` pela pasta `d20age` do ZIP e reabra como mestre. Aguarde a preparação dos compêndios. Se a preparação automática estiver desativada, execute **Preparar compêndios**. As descrições da revisão 0.4.7 continuam preservadas. Os campos novos das magias são preenchidos uma vez; fórmulas personalizadas e PV de criaturas já importadas são mantidos.

Na ficha, **Atributos** inclui **Subir nível · rolar DV**, iniciativa individual/grupo, ajuste de XP que aceita números negativos e registro de PV por nível. Aumentar o campo Nível também abre a confirmação. Cada novo nível soma um DV da classe, CON e robustez do anão, com mínimo 1 PV. A diferença entre PV atuais e máximos é preservada. Corrigir um nível para baixo desconta somente ganhos registrados; restaurá-lo reaproveita o dado anterior. Rolagens antigas desconhecidas ficam como uma base preservada.

Em **Equipamentos**, a carga soma quantidade × peso dos registros carregados, todas as moedas e a carga adicional. As faixas são leve (até 400 cn), média (até 800), pesada (até 1.600) e sobrecarga (até 2.400), com MV 40/30/20/10 pés conforme o LB p.64. Limites e exceções de anão/gnomo permanecem aplicados. O ajuste de XP é uma escolha da mesa: a regra de SAB fornece os bônus positivos do livro, sem inventar uma penalidade automática.

Em **Magia**, “posições” passa a **espaços de memorização**. Os registros têm Alvo, alcance, duração, descrição, fórmulas de dano/cura/PV temporários e ajustes de CA/SV/PV máximos/acerto/dano. Salvaguardas necessárias permanecem na descrição. Conjurar consome a memorização; os botões de rolagem não consomem uma segunda memorização. Selecione alvos no mapa para aplicar o resultado; confirme a quantidade depois de resolver salvaguarda/resistência. Jogadores só alteram alvos que podem editar; o mestre aplica nos demais. **Aplicar último resultado** permite usar o mesmo resultado em outros alvos.

Flecha mágica rola **1d6+1 por flecha** e informa quantas flechas o nível permite, para distribuir entre alvos. Bola de fogo rola 1d6 por nível; Mãos flamejantes, 1d4. Restauração rola 1d6+1 por círculo memorizado. Armadura mágica gera 1d4 PV temporários por nível; estes absorvem dano antes dos PV normais. Heroísmo e proteções oferecem ajustes nativos removíveis. Confira a condição antes de aplicar bônus condicionais; encerre-os em **Efeitos de magia ativos** ao terminar a duração/condição. Imunidades, ataques de retorno, dano reduzido e efeitos narrativos continuam dependentes da descrição e arbitragem.

O gerador possui a tabela d20 de idiomas do LB p.55: escolha ou sorteie, mantendo Comum e os idiomas de anão/elfo/gnomo. Alinhamento pode ser Ordem, Neutralidade ou Caos. Os idiomas de alinhamento indicam a escolha do personagem. INT informa os idiomas adicionais; escolhas extras são sinalizadas para a mesa. **Notas** tem um campo separado de **Anotações da aventura**. A geração registra o DV do primeiro nível.

Na lista de atores, o mestre encontra **Painel de criaturas**; também existe uma macro com o mesmo nome. Arraste uma criatura do mundo ou do compêndio para criar “Criatura 1”, “Criatura 2”… Cada exemplar recebe seus próprios PV e mantém dano, cura, ataques, SV, moral e anotações. O painel persiste no mundo, é exclusivo do mestre e seus PV não alteram a ficha original nem sincronizam automaticamente com tokens de cena. Use a ficha do token para administrar PV diretamente no mapa.

Criaturas importadas e novos tokens não vinculados rolam seus DV: d8 por DV, d4 para ½ DV, com bônus fixos como 2+2 = 2d8+2. Asteriscos indicam poderes. A ficha oferece **Rolar PV · dados de vida** e uma fórmula opcional. PV não são relançados ao sofrer dano. Hidras mantêm 8 PV por cabeça; ratos em colônia usam 1d6+4; morcegos em colônia exigem informar a quantidade (1 PV por morcego). As regras especiais estão sinalizadas nas notas.

**Iniciativa individual** rola a ficha; **Iniciativa do grupo selecionado** usa uma única rolagem para os tokens selecionados que estão no encontro. O rastreador também oferece botões para aventureiros e criaturas ao mestre. A fórmula segue as configurações da mesa, com 1d6 como padrão. Iniciativa individual é opção da mesa; o livro prioriza a situação ficcional e usa d6 × d6 para desempate.

Tokens padrão usam a mesma ilustração do retrato, recortada em círculo com borda monocromática. Texturas personalizadas são preservadas. Os resultados de SV no chat aplicam texto branco explicitamente.

**Verificação:** 120 testes automatizados; prévias de ficha/gerador/painel no navegador e integridade CRC de todos os arquivos do ZIP. Os testes de integração usam um contrato da API, sem o runtime proprietário. A execução no cliente licenciado do Foundry V13 permanece pendente.

## Versão 0.4.7 — Descrições individuais dos compêndios

Os oito compêndios foram revisados registro por registro. Equipamentos, ervas, veículos, máquinas de guerra, magias, habilidades e itens mágicos recebem apenas o texto pertinente ao registro. As dez perícias têm registros próprios, incluindo Esconder e Idioma. No bestiário, os poderes herdados são delimitados pela família e categoria corretas, sem absorver o cabeçalho, estatísticas ou poderes da criatura seguinte. Ataques descrevem somente sua própria ação. Os textos de consulta apresentam tabelas específicas; a página original fica identificada como contexto.

Textos de descrição, biografia e chat usam alinhamento justificado, parágrafos e quebras próprias da leitura, sem as linhas estreitas extraídas do PDF.

Para atualizar: substitua `Data/systems/d20age` pela pasta do ZIP e abra o mundo como mestre. Aguarde a preparação dos compêndios. Se a preparação automática estiver desativada, execute a macro **Preparar compêndios**. A revisão altera somente descrições, organização e vínculos incorretos de poderes; estatísticas, quantidades, recursos e retratos personalizados são mantidos. Poderes indevidamente atribuídos pelo importador antigo são retirados dos compêndios e substituídos pelos poderes pertinentes. Após a revisão, repetir a preparação preserva novas edições do mestre.

Itens e criaturas já importados também têm seus textos corrigidos quando o conteúdo é uma cópia exata da descrição antiga do sistema. Textos personalizados são preservados. As cópias em fichas existentes não têm poderes adicionados ou removidos automaticamente; para adotar a organização completa dos poderes de uma criatura, importe a ficha atualizada do bestiário.

Foram conferidos 1.416 registros nos oito compêndios e 815 registros internos de criaturas. O arquivo `content/description-audit.json` identifica cada registro e sua página de origem. As rotinas `tools/repair-descriptions.py` e `tools/repair-reference-text.py` tornam a delimitação reproduzível. 91 testes automatizados passaram, incluindo instalação, atualização de mundos antigos, preservação de edições e isolamento das descrições. Validação visual no cliente licenciado do Foundry V13 permanece pendente.

## Versão 0.3.4 — Contraste e cursor

Os capítulos selecionados agora aplicam texto branco explicitamente ao numeral, nome e ornamento. Hover e foco usam o mesmo contraste. Campos dos atributos recebem um cursor de edição com contorno duplo preto e branco, caret preto e destaque de borda ao passar ou focar. Alterações apenas visuais na ficha Tinta e hachuras.

## Versão 0.3.3 — O livro do aventureiro

A ficha opcional **D20Age · Tinta e hachuras** agora tem uma composição independente: frontispício com retrato em arcada, identidade e navegação vertical por capítulos; manuscrito de combate com brasões de atributos, sobrevivência em quatro emblemas, salvaguardas em linhas e registro de ataques. Molduras vetoriais, hachuras cruzadas e divisórias gravadas permanecem fora dos campos de leitura. As outras páginas adotam a diagramação de livro de registro. A ficha padrão continua disponível e nenhuma estatística muda.

Seleção: menu da ficha → Configurar ficha → Esta ficha → D20Age · Tinta e hachuras. A prévia abre nesse estilo; o seletor Estilo permite comparar com o padrão. Janela sugerida: 1080 × 940. Layout se reorganiza em janelas menores.

67 testes automatizados passaram; validação no cliente Foundry V13 ainda necessária. O ZIP é fechado e verificado antes de disponibilizado.

# D20Age RPG para Foundry VTT — 0.3.1

Estrutura independente do sistema, direcionada ao **Foundry V13**. Ficha OSR em preto, branco e cinza, com papel, molduras e hachuras que lembram desenho a lápis. Espadas, escudos e objetos de aventura aparecem em SVGs próprios e escaláveis. Sem dependências de módulos ou fontes externas. Este pacote é um sistema: não é um módulo para D&D5e ou Custom System Builder.

## Instalação local

1. Feche o Foundry ou retorne à tela de configuração.
2. Extraia o ZIP dentro da pasta `Data/systems` do diretório de dados do Foundry.
3. Confira o resultado: `Data/systems/d20age/system.json`. Evite criar uma segunda pasta `d20age` dentro da primeira.
4. Reinicie o Foundry. Crie um mundo novo e escolha **D20Age RPG**.
5. Crie um ator **Aventureiro** ou **Criatura / NPC**.

Não há URL de manifesto publicada nesta etapa. A instalação é pelo ZIP. Faça a primeira conferência em um mundo de teste; a versão ainda é inicial.

## Já implementado

- Modelos de dados tipados e fichas nativas com ActorSheetV2 e ItemSheetV2.
- Sete progressões de classe/povo, incluindo XP, TAC0, salvaguardas e posições de magia.
- Seis atributos e ajustes individuais; Destreza no acerto e Sabedoria na SV de Feitiço.
- PV atuais/máximos e suporte a PV negativos, sem impor uma resolução automática de morte.
- CA descendente e ascendente; TAC0 e BA mostrados juntos.
- Armas equipadas com rolagens de ataque e dano no chat; acerto automático contra um único alvo selecionado.
- 1/20 naturais nos ataques; sem dano crítico dobrado automático.
- Inventário com itens editáveis, quantidade, peso, equipamento e armazenamento fora da carga.
- Proteção calculada pela melhor armadura e um escudo; sem bônus de Destreza na CA.
- Moedas, carga, movimento e exceções básicas de anão/gnomo.
- Fatiga, exaustão, bônus e valores manuais para a arbitragem da mesa.
- Registro de magia, posições por círculo, consumo de memorização e restauração confirmada.
- Criaturas com TAC0, CA, salvaguardas, DV e moral manuais.
- Geração inicial opcional: 3d6 em ordem, DV + Constituição e 3d6 × 10 po.
- Arrastar itens para a ficha por meio do mecanismo nativo do Foundry.

## Uso da ficha

Os valores são salvos quando o campo é alterado. Escolha a classe e o nível para consultar as tabelas; isso **não** rola PV, aplica subida de nível ou concede habilidades automaticamente. Registre os PV obtidos e as habilidades da classe.

Em **Equipamento**, crie uma arma, abra o registro e preencha dano/peso/bônus. Marque `Carregado` e `Equipado`. Os botões aparecem em Ataques. O dano é enviado ao chat e não é aplicado automaticamente ao alvo.

Em **Magia**, registre cada magia como item. Informe seu círculo, o círculo da posição, a quantidade memorizada e a quantidade consumida. A ficha conta as posições por círculo. Uma posição superior pode receber magia inferior. Quando uma mesma magia for preparada em círculos diferentes, use registros separados. A magia oculta do magista tem controle separado e conversão manual.

Em **Ajustes**, desligue os cálculos automáticos para usar valores próprios. Quando a proteção automática está ativa, CA manual é ignorada e o ajuste de CA continua aplicado. Na SV de Feitiço, Sabedoria é incluída separadamente no bônus da rolagem: não a some novamente ao campo de bônus.

Para criaturas, CA, TAC0 e salvaguardas são sempre manuais. O deslocamento também é manual. Nesta fase, conjuração automatizada pela ficha utiliza as posições de personagens; poderes de criaturas são registrados como habilidades ou descritos em notas.

## Limites desta etapa

Os compêndios e macros estão disponíveis. Efeitos condicionais de magia e itens, geração encadeada de tesouros, evolução automática da flor do tempo, conversão automática da magia oculta e avanço assistido de nível continuam sob arbitragem manual. As macros de relógio avançam o tempo, sem consumir automaticamente luz ou suprimentos. O contador de iniciativa usa d6 individual como apoio ao rastreador: a iniciativa ficcional e a opção de disputa grupal continuam sob controle do mestre.

Treinamento, especialização, alcance, duas armas, ancestralidades e propriedades especiais são registrados por bônus/notas. A redução de peso de proteção adaptada para gnomos deve ser informada no peso do item. Agregados de carga usam a carga adicional ou um item representando o conjunto; não registre o mesmo peso duas vezes.

Modificadores de atributo seguem a tabela até 18; para valores acima do intervalo ordinário, utilize ajustes conforme decisão da mesa. Não há teste genérico de atributo nem bônus de proficiência universal.

## Validação

Execute `npm test` com Node 20 ou superior. Os testes verificam as tabelas e cálculos, modelos de dados, inicialização, submissão de fichas, rolagens e ações essenciais sob uma simulação da API. A prévia visual usa o mesmo HTML/CSS da ficha.

**O pacote não foi executado dentro de uma instalação licenciada do Foundry neste ambiente.** A compatibilidade alvo é V13 e a API foi consultada na documentação oficial, mas a validação final de instalação, persistência, arrastar/soltar e permissões deve ocorrer no Foundry. O manifesto declara V13 em `minimum`, `verified` e `maximum`, eliminando o aviso de compatibilidade desconhecida. Essa declaração não substitui a validação integral em uma instalação real.

## Estrutura

`scripts/rules.mjs`: tabelas e cálculos independentes do Foundry.

`scripts/models.mjs`: schemas de atores e itens.

`scripts/documents.mjs`: documentos e rolagens.

`scripts/sheets.mjs` e `scripts/view.mjs`: integração e apresentação.

`styles/d20age.css`: identidade visual monocromática.

`preview/`: prévia local com dados fictícios. Execute `node tools/preview-server.mjs` e abra `http://127.0.0.1:8765/preview/`.

`tests/`: verificações automatizadas; `tools/package.py`: empacotamento reproduzível.

## Referências técnicas

- https://foundryvtt.com/article/system-development/
- https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html
- https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ItemSheetV2.html
- https://foundryvtt.com/api/v13/classes/foundry.applications.apps.DocumentSheetConfig.html

Fonte das regras: **d20age RPG — Livro Base V2**, fornecido pelo usuário. Divergências de regras e dados preservados estão em `docs/DECISOES.md`.

## Alterações da versão 0.1.2

Compatibilidade V13 declarada; indicadores de CA, TAC0 e movimento com escudo, espada e bota; cartões de chat para ataques, dano, salvaguardas, moral, magia e geração; ajustes agrupados com alternadores, campos manuais condicionais, incrementos e redefinição de bônus.

## Alterações da versão 0.1.3

Formulários de registros agrupados em cartões com a estética de Ajustes; inventário e magias em cartões; envio de descrições ao chat em todos os tipos de registro; navegação das quatro seções transferida para abas laterais à direita. O envio de descrição não rola dados, não conjura e não consome memorizações ou cargas. A prévia permite criar registros e enviar descrições a um chat de demonstração.

## Alterações da versão 0.1.4

Visão de vida, defesa, movimento, XP, salvaguardas e ataques restrita à aba Equipamento. Vida em coração desenhado, identificação em cartão e nível em selo. Clique esquerdo no retrato abre ImagePopout V13, com o controle nativo para compartilhar; clique direito abre FilePicker para proprietários com permissão de edição. A troca altera somente o retrato do ator, preservando a imagem do token.

## Alterações da versão 0.1.5

Aba inicial Atributos reúne vida, CA, TAC0, movimento, atributos, XP, salvaguardas, condições e ataques. Atributos e condições agora usam cartões horizontais, com adaptação a janelas estreitas. Equipamentos contém somente armas, proteções e equipamentos, além de carga e moedas; Habilidades tem lista própria. Magia, Notas e Ajustes permanecem separados. Retrato ampliado para 136 × 174 pixels na ficha padrão.

## Alterações da versão 0.1.6

Ícones laterais ampliados para 36 pixels. Capa original incluída na mídia de apresentação do sistema. Música Mapas de Pergaminho incluída. Na primeira entrada de um mestre ativo, o sistema cria uma playlist com repetição e uma cena de capa vinculada a ela; ativa a capa somente em mundos sem cenas. A instalação não muda a cena ativa de campanhas existentes e não duplica o conteúdo em recargas.

O mundo-base em `world-template/d20age-base` já tem a capa em seu manifesto. Copie essa pasta para `Data/worlds/` com o Foundry fechado. Para mundos criados pelo botão Criar mundo, selecione `systems/d20age/assets/cover.png` como imagem de fundo: o sistema não executa código na tela de criação do Foundry. A cena e a playlist são criadas na primeira entrada do mestre em ambos os casos.

## Alterações da versão 0.1.7

Ficha própria para criaturas, 620 × 760 pixels, sem abas de personagens. PV, CA, TAC0 e movimento editáveis, DV e moral, SV comum aplicável aos cinco alvos, ataques e habilidades. Descrição, condições, atributos opcionais e ajustes de combate ficam em painéis recolhíveis. Dados existentes são preservados; o modelo de criatura continua compatível.


## Compêndios — versão 0.2.0

No primeiro acesso do mestre, o sistema prepara oito compêndios nativos do mundo: Bestiário (162 fichas), Equipamentos (132), Magias (60), Habilidades e perícias (620, incluindo habilidades de criaturas e fortunas), Itens mágicos e especiais (183), Tabelas roláveis (60), Tabelas de consulta (92) e Macros (76).

Abra a aba Compêndios. Arraste criaturas para Atores, itens para fichas e macros para a barra de atalhos. Na configuração nativa do compêndio, o mestre pode conceder acesso aos jogadores. As fichas de criaturas usam estatísticas manuais e a ficha compacta.

Os dados JSON são incluídos em `content/`. A instalação usa a API nativa de criação de compêndios e documentos do Foundry V13, sem depender de um banco LevelDB pré-compilado. Registros já presentes são preservados, inclusive edições do mestre. Falhas parciais são retomadas no próximo acesso. Use a macro **Preparar compêndios** ou `await game.d20age.installCompendia({force:true})` no console para repor registros ausentes.

As consultas preservam os 87 títulos do índice de tabelas e cinco referências adicionais. Tabelas de custo, progressão e conversão são referências de consulta; os sorteios selecionados usam RollTable. Venenos e miscelâneas especiais usam d12 para as 12 entradas impressas sob d10; pedras iônicas usa d8 para suas oito entradas. Essas correções estão indicadas na descrição, e a imagem original permanece disponível.

As 162 criaturas correspondem a todos os blocos completos de estatísticas do Manual de Criaturas, incluindo variantes e árvore animada. Criaturas apenas mencionadas em encontros, sem ficha publicada, permanecem referências textuais. Dragões usam estatísticas de adultos. Colônias têm PV iniciais de referência; hidras começam com 8 PV por cabeça (40 ou 56 PV). Ataques múltiplos, corte/regeneração de cabeças, venenos, imunidades e efeitos automáticos são resolvidos conforme descrições. Cada clique rola um ataque ou seu dano.

Cajados e orbes têm capacidade preenchida. Varinhas começam com 20 cargas; para um exemplar encontrado, sorteie 2d10. Anel de reflexão e escaravelhos começam com 7 cargas de referência; geração aleatória usa 2d6. A macro de cargas desconta o custo escolhido e não recarrega itens automaticamente.

Itens +1/+2/+3 têm bônus numéricos de ataque/dano ou proteção preenchidos. Fortunas e propriedades especiais são registros de descrição para aplicar em Ajustes. A massa de miscelâneas guardadas é agrupada na mochila/bolsa, conforme o livro, sem somar cada objeto novamente.

### Scripts e reconstrução

As macros têm fontes `.mjs` em `macros/`, e sua API está em `scripts/compendia.mjs`. Para reconstruir o conteúdo a partir do PDF autorizado, execute `python tools/build-content.py`, `python tools/build-rolltables.py`, `python tools/finish-content.py` e `python tools/organize-content.py`, nesta ordem. O primeiro script espera o PDF em `../project_sources/01-d20age-RPG-LB-V2-.pdf` e usa PyMuPDF e Pillow. O pacote inclui os JSONs e imagens prontos; não é necessário reconstruí-los para jogar.

`npm test` verifica fichas, mecânicas, inventário de criaturas, círculos de magia, cobertura das tabelas, integridade das referências e contratos de instalação/retomada. Os testes usam uma simulação da API; a verificação em uma instalação licenciada do Foundry permanece necessária.

## Organização e arte — versão 0.2.1

Os oito compêndios ficam sob **D20Age RPG**, nas pastas Criaturas, Inventário, Personagens, Referências e Ferramentas. Dentro deles há 114 pastas e subpastas. O bestiário usa Bestas, Construtos, Desmortos, Dracônicos, Extraplanares, Feéricos, Floranídeos, Gigantes, Humanoides e Monstros; famílias com variantes têm sua própria subpasta. Magias ficam por círculo; armas, proteções, utensílios, consumíveis, transportes, habilidades e itens mágicos recebem categorias próprias.

Os registros e ataques/poderes embutidos recebem 2.174 arquivos SVG originais, com símbolos de aventura, traços pretos e hachuras. São ícones por categoria e função, com motivos compartilhados, sem imagens raster embutidas. Retratos e imagens de token personalizados são preservados na atualização.

A capa usa a referência “Rumo ao castelo distante”. Ao entrar como mestre, a atualização organiza os compêndios existentes e substitui a imagem da cena de apresentação marcada pelo sistema. Mantém nomes, atributos, descrições, música e tokens; outras cenas não são modificadas. A capa tem uma versão na URL para renovar o cache de imagem. A mesma imagem é usada no mundo base distribuído.

## Gerador visual — versão 0.3.0

Abra **Gerar personagem** na aba Atores. Para preencher uma ficha vazia própria, de nível 1, use **Gerador de personagens** na aba Atributos. Também disponível por `await game.d20age.openCharacterGenerator()` ou `await game.d20age.openCharacterGenerator({actor: game.actors.get("ID")})`. A criação de novos atores respeita a permissão do usuário; o mestre pode fornecer uma ficha vazia a quem não puder criar atores.

O assistente tem seis páginas: **Classe → Atributos → Dons e magia → Vida e recursos → Equipamentos → Nome e revisão**. Voltar mantém as escolhas enquanto a janela está aberta. Fechar ou cancelar antes de concluir não modifica a ficha nem cria registros. As sete classes possuem ilustrações vetoriais originais em `assets/classes/`, também disponíveis como retrato ao concluir.

Atributos usam 3d6 em ordem como padrão (FOR, INT, SAB, DES, CON, CAR, conforme os passos da p. 15). A p. 18 inverte CON/DES no texto introdutório; o gerador conserva a ordem explícita da criação e da ficha. A distribuição livre mantém seis resultados separados e troca suas posições, sem reutilizar dados; distribuição e entrada manual são identificadas como opções da mesa. Relançamentos devem seguir o acordo da mesa. Não aplica automaticamente os bônus opcionais do comentário do autor para séries de modificadores baixos.

No nível 1: combatente escolhe arma especializada; especialista e gnomo escolhem uma perícia; anão, elfo e gnomo escolhem ancestralidade; arcanista e elfo escolhem uma magia de 1º círculo; magista escolhe uma das seis magias ocultas. Arcanista e magista recebem um implemento inicial. A posição oculta do magista fica nos campos próprios, sem consumir uma posição comum que sua progressão ainda não possui. A primeira magia de arcanista/elfo fica memorizada.

PV usam o dado da classe + CON (anão recebe +1), com mínimo 1. Recursos usam 3d6 × 10 po; valores manuais são opções da mesa. As compras descontam preços do Livro Base, conservam lotes, mostram saldo em tempo real e convertem o restante para moedas inteiras. O kit de exploração é uma sugestão de compras, com custo descontado. Proteções de gnomo têm peso dividido por dois, sem mudar o preço. Pode comprar equipamento sem treinamento, mas a revisão avisa e as penalidades de uso são arbitradas pela mesa. Equipamentos sem massa própria seguem o agrupamento da mochila/bolsa do livro.

Especialização e perícia Arma aplicam os bônus somente aos exemplares comprados no assistente; as habilidades também registram a escolha para futuras aquisições. Pele-pedra melhora a CA em 1, e pés ligeiros ajusta o movimento para 40 pés. Efeitos condicionais como imunidades, fadiga ignorada, bônus de SV situacionais e a sorte ficam como habilidades de consulta. Idiomas extras são preenchidos por texto; a revisão avisa quando excedem a INT. Personagens começam sem alinhamento.

A conclusão em uma ficha existente pede confirmação após a revisão, conserva seus registros e adiciona os novos. Retratos personalizados começam com a opção de substituição desmarcada. Um registro da preparação original fica em `flags.d20age.creationOriginal`. Uma ficha já concluída pelo assistente não pode ser gerada outra vez, evitando compras e dons duplicados. Para outro personagem, abra uma nova criação.

`python tools/generator-preview.py` produz uma prévia offline com os mesmos módulos de regras, navegação e apresentação. Ela demonstra as etapas, sem ligação com uma sessão do Foundry. Verificações cobrem escolhas das sete classes, atributos, compras, bônus, permissões, cancelamento, conclusão única e recuperação após falha. A execução em Foundry V13 licenciado ainda precisa de validação.

## Capa e ilustrações — versão 0.3.1

A capa do sistema e do mundo base agora usa a imagem colorida “Calabouço ancestral do D20Age-1”, enviada como ref. 1. A cena padrão recebe a mesma imagem, com tamanho nativo 1100 × 1430 e sem deformação. A música, os tokens e outras cenas são preservados.

Os sete SVGs de classe foram retirados do pacote e substituídos por PNGs originais de 1024 × 1536, com tinta preta, hachuras e sombras no estilo das refs. 2 e 3. Os arquivos estão em `assets/classes/`: `arcanist.png`, `fighter.png`, `specialist.png`, `magist.png`, `dwarf.png`, `elf.png` e `gnome.png`. São usados nos cartões de escolha, nos dons, na revisão e no retrato escolhido pelo gerador. Os cartões exibem imagens maiores.

Ao entrar como mestre ativo, os retratos e tokens que ainda apontam exatamente aos SVGs de classe do sistema são atualizados para PNG. Registros com imagens personalizadas são preservados. A atualização alcança atores, itens e tokens das cenas do mundo, incluindo atores de tokens não vinculados. Reabrir o mundo retoma uma atualização interrompida; novos acessos não repetem gravações já realizadas.

As ilustrações foram produzidas com a ferramenta integrada de geração de imagens, usando as referências enviadas. O conjunto completo de prompts está em `assets/classes/prompts.json`. Os SVGs de itens e criaturas permanecem no formato vetorial solicitado anteriormente.


## Configurações e calendário — versão 0.4.0

Em **Configurações → Configurar definições → D20Age RPG**, abra **Medidas**, **Regras de combate** ou **Calendário**. Somente o mestre altera as configurações do mundo. Cada jogador pode escolher se o painel de data abre automaticamente. O botão **D20Age · Calendário** na barra de configurações reabre o painel; clicar na data abre o mês completo.

Medidas permitem pés/metros, cn/quilogramas/libras e litros/galões americanos/pés cúbicos. Movimento, peso, carga e capacidade dos itens são apresentados e editados na unidade escolhida, preservando os valores internos usados nas regras: pés, cn e litros. Uma cn equivale a aproximadamente 50 g. Textos livres de alcance e duração permanecem como escritos. A conversão da grade da cena atual é opcional e preserva a distância representada; não muda outras cenas.

Combate permite escolher iniciativa d6/d10/d20, segundos por rodada, minutos por turno de exploração, acerto/erro automático em 20/1, apresentação de CA descendente ou ascendente e dano normal ou dados dobrados no 20 natural. Dados dobrados aplicam-se à próxima rolagem de dano da mesma arma, uma única vez, sem dobrar bônus fixos. Essas alternativas são regras da mesa; os padrões mantêm as regras anteriores do sistema.

O calendário gregoriano já vem pronto, com as regras de anos bissextos. O mestre pode criar calendários com meses, dias da semana, era, duração do dia e regras bissextas próprias. O gregoriano original é protegido; crie uma cópia personalizada para modificá-lo. Ao trocar o calendário ativo, conserva-se o tempo transcorrido, interpretado pelo novo calendário. O calendário começa no primeiro dia do ano 1; use o controle de data completo para definir a data da campanha.

Todos os jogadores podem consultar e navegar pelos meses. Em **Calendário → Permissões individuais**, o mestre marca cada jogador autorizado a alterar a data e os eventos; desmarcar revoga a edição. A proteção também usa a propriedade do documento nativo, impedindo gravações de usuários sem autorização. Os eventos são públicos, com título e notas; não há eventos secretos nesta versão.

A ligação opcional com o relógio do mundo acompanha a passagem do tempo de combate e das macros. Os avanços do mestre também avançam o relógio nativo quando a ligação está ativa. Jogadores autorizados ajustam a data do calendário, sem precisar de permissão para alterar o relógio nativo. O painel resumido oferece avanços de dia e turno; a visão completa inclui semana, mês, rodada, data manual e eventos.

A prévia offline demonstra consulta, autorização/revogação, eventos, unidades e criação básica de calendários, sem alterar um mundo real. Os testes automatizados simulam contratos da API; a validação visual e multijogador em Foundry V13 licenciado permanece pendente.


## Acesso e pausa — versão 0.4.1

Na barra **Notas** dos controles da cena, o ícone de calendário abre ou fecha o painel resumido. Se a visão completa estiver aberta, fechar pelo ícone fecha as duas janelas. O botão é visível para todos os jogadores; a edição continua dependendo da autorização individual do mestre.

**− Turno** está disponível no painel resumido e no calendário completo. Usa os minutos configurados para o turno de exploração e respeita as permissões de edição e o início do calendário.

A pausa nativa exibe a logotipo transparente extraída do Livro Base fornecido. A imagem fica estática, com o texto nativo de pausa; pausar e retomar continuam usando os controles normais do Foundry.


## Correção da pausa — versão 0.4.2

Corrige o evento de renderização da pausa para **renderGamePause** no Foundry V13. A substituição da imagem também é aplicada diretamente pelo CSS do sistema, para não depender somente do evento. Mantém a faixa e o texto nativos, com a logotipo transparente do D20Age no lugar da bússola.


## Texto de pausa — versão 0.4.3

O texto “Jogo pausado” usa amarelo vivo, combinando com a logotipo, e fica mais próximo da imagem. A regra inclui os elementos de legenda usados pela interface nativa.


## Compras e seleção — versão 0.4.4

O gerador conserva a posição da lista, as descrições abertas e o foco ao comprar, remover ou equipar itens. Ao mudar de etapa, a nova página começa no topo. Caixas de seleção e botões de opção têm tamanho consistente nas fichas e no gerador, com a marca desenhada dentro da caixa.


## Consulta de equipamento — versão 0.4.5

A lista de compras não exibe descrições expansíveis. Clique no nome ou na imagem do equipamento, ou no nome na mochila, para abrir a ficha do registro no compêndio de Equipamentos. A consulta não altera as compras nem reposiciona a lista. O acesso ao compêndio segue as permissões configuradas pelo mestre.


## Contraste das abas — versão 0.4.6

A ficha Tinta e Hachuras aplica branco explicitamente ao numeral, nome e símbolo da aba selecionada, mantendo o fundo preto. A regra inclui a cor de preenchimento do texto no Chromium para evitar interferência do tema do Foundry.
