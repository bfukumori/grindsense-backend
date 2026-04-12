import { openapi } from '@elysiajs/openapi';
import { OpenAPI } from '@/lib/better-auth';

export const openApiPlugin = openapi({
  path: '/docs',
  documentation: {
    info: {
      title: '🔋 GrindSense API',
      version: '1.0.0',
      description: `
O **GrindSense** é o motor de back-end de um projeto de Iniciação Científica desenvolvido para o **NEXT 2026 (FIAP)**. 

Esta API alimenta uma plataforma de gamificação adaptativa que ajusta a carga de produtividade dos estudantes com base nos seus dados biométricos (como Variabilidade da Frequência Cardíaca - HRV e qualidade de sono), recolhidos passivamente via integração com *wearables* (Fitbit).

O objetivo principal é mitigar o *burnout* acadêmico, substituindo a gamificação punitiva por um sistema que respeita a recuperação fisiológica.

### 🚀 Principais Módulos
* **Gamificação Adaptativa (\`/tasks\`):** Distribuição de XP e gestão de tarefas ajustadas pelo estado de prontidão (*Readiness*) do estudante.
* **Sistema Anti-Shame:** Foco na recuperação, evitando perda de *streaks* em dias de alta exaustão mental ou física.
* **Integração IoT (\`/biometrics\`):** Sincronização segura de dados de saúde via OAuth 2.0.
* **Identidade (\`/auth\`):** Gestão de sessões e segurança blindada gerida pelo *Better-Auth*.

### 🔒 Autenticação
As rotas protegidas exigem uma sessão ativa. Utilize os endpoints em \`/auth\` para realizar o login. O *cookie* de sessão ou o *header* de autorização será exigido nas requisições subsequentes.
          `.trim(),
      contact: {
        name: 'Equipe GrindSense (IC - FIAP)',
        url: 'https://github.com/bfukumori/grindsense-backend',
      },
    },
    components: await OpenAPI.components,
    paths: await OpenAPI.getPaths(),
  },
});
