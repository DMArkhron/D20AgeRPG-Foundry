# Testes e proteção de builds

A referência inicial é a suíte da versão 0.6.4, preservada em
`regression/previous-tests.zip`. Editar ou apagar um teste atual não modifica
essa cópia. A suíte anterior é executada sobre o código e os recursos atuais
em um diretório temporário, sem misturar os arquivos de teste.

## Durante o desenvolvimento

- `npm run test:watch`: verifica ao iniciar e depois de cada alteração salva.
  Mantenha esse comando aberto no terminal; encerre com Ctrl+C.
- `npm run check`: verifica sintaxe JavaScript, manifesto, arquivos JSON,
  testes atuais e testes preservados da versão anterior.
- `python3 tools/regression.py --previous /pasta/anterior`: também executa
  os testes na build anterior completa e usa os testes dela sobre a atual.
- `npm run package`: exige aprovação antes de criar o ZIP e valida sua
  integridade. Uma falha encerra o processo sem substituir o pacote anterior.

Requisitos locais: Node.js 22 e Python 3.12 (ou versões compatíveis).

## No GitHub

O workflow `Regressão D20Age` roda em cada push e pull request. Compara com
o commit anterior ao push ou com o destino do pull request. Testa a build
anterior, os testes atuais e os testes anteriores aplicados ao código novo.
No primeiro commit sem histórico, utiliza a referência incluída no pacote.
Só disponibiliza um artefato ZIP se todas as etapas passarem.
O workflow de cadastro no Foundry também depende dessa verificação.

Para impedir merges com falhas, configure nas regras da branch principal
o check `regression` como obrigatório. O workflow sozinho informa a falha,
mas não muda as regras de proteção do repositório.

## Atualizar a referência

`npm run baseline:accept` primeiro exige aprovação dos testes e então
promove a suíte atual. Faça isso apenas depois de revisar a versão aprovada.
Se uma mudança intencional tornar um teste antigo inválido, revise a
expectativa e registre o motivo antes de atualizar o baseline; uma falha
não é motivo para apagar o teste ou desativar a verificação.

## Limites

Os testes protegem os comportamentos cobertos pela suíte, incluindo regras,
fichas, compêndios, calendário, geração, iniciativa, inventário e permissões.
Não garantem ausência absoluta de bugs. O Foundry é simulado nos testes:
renderização, interação real, módulos externos e diferenças entre builds
do Foundry ainda precisam de verificação dentro do aplicativo.

## Primeira atualização do GitHub (0.6.1 → 0.6.5)

O commit 6ad46b5bb383e4310a4f17e2642da96771a69356 ainda contém a 0.6.1.
Seus 164 testes passam na própria versão. Aplicados à 0.6.5, 162 passam;
dois exigem imagens em assets/icons e SVG, incompatíveis com a substituição
solicitada por retratos JPEG e tokens circulares. Foram revisadas as falhas de
compendia.test.mjs e organization.test.mjs: ambas dizem respeito a essa
mudança intencional de formato, não às estatísticas ou permissões.

Somente quando o ancestral comparado é esse SHA exato, o workflow testa
a versão antiga isoladamente e usa a suíte preservada da 0.6.4 sobre a
0.6.5 (171 testes atuais e 171 anteriores). Nos demais commits, a comparação
com a suíte do commit anterior permanece integral. Nenhum teste é apagado
e o baseline preservado não foi modificado.
