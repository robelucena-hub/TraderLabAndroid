# Mercados Inteligentes • Trader Lab — Android

Aplicativo Android que empacota o Trader Lab como conteúdo local em um WebView. O app funciona sem depender de um site para a interface principal e preserva o estado da simulação via armazenamento do WebView.

## Funcionalidades
- Mercado simulado e gráfico intradiário
- Compra e venda
- Ordens a mercado e limitadas
- Ordens pendentes
- Carteira, preço médio e P&L
- Score multifatorial educacional de IA
- Persistência local da carteira

## Compilar localmente
Requisitos: JDK 17, Android SDK 35 e Gradle 8.10.2.

```bash
gradle :app:assembleDebug
```

APK gerado em:
`app/build/outputs/apk/debug/app-debug.apk`

## Compilar automaticamente no GitHub
O projeto inclui `.github/workflows/build-apk.yml`. Ao enviar para um repositório GitHub, execute a action **Build Android APK**. O APK aparecerá em **Actions → Artifacts**.

## Identidade
- Application ID: `com.contadordoamanha.traderlab`
- Nome: `Mercados Inteligentes • Trader Lab`
- Versão: `1.0.0`
- minSdk: 23
- targetSdk: 35

## Aviso
Simulador educacional com dados fictícios. Não utiliza cotações reais e não constitui recomendação de investimento.
