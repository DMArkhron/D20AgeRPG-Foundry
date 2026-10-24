# Verificação obrigatória do D20Age

Após modificar código, dados, imagens ou estilos, execute `npm run check`.
Corrija as falhas antes de entregar ou empacotar. Use `npm run test:watch`
durante a edição para repetir a verificação após salvar arquivos.

`npm run package` também executa o gate; não remova nem ignore essa etapa.
O baseline em `regression/previous-tests.zip` é independente dos testes atuais.
Não altere o baseline automaticamente para contornar uma falha.
Mudanças intencionais de comportamento exigem revisão explícita do teste anterior.
Após aprovação dos testes atuais e anteriores, `npm run baseline:accept`
promove os testes atuais para referência da próxima versão.

Quando houver a build anterior completa, prefira
`python3 tools/regression.py --previous /caminho/da/build-anterior`.
Os testes usam contratos simulados do Foundry: não declare a interface ou o
runtime do Foundry validados sem executar uma sessão real.
