/**
 * Seeds a demo account with topics spread across every retention band.
 *
 *   npm run db:seed        (or: npx prisma db seed)
 *
 * Login: demo@estudei.app / estudei123
 *
 * Each topic gets a realistic review history: sessions are replayed along the
 * 1-3-7-15-30 ladder (with small delays, like a real student) so the trend
 * chart has data from day one. Re-running the seed resets the demo account.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { addDays, retentionAt, stateAfterSession, type MemoryState } from "../src/lib/forgetting-curve";
import { createPrismaClient } from "../src/server/db";

const prisma = createPrismaClient();

const DEMO_EMAIL = "demo@estudei.app";
const DEMO_PASSWORD = "estudei123";

interface SeedTopic {
  title: string;
  subject: string;
  notes?: string;
  /** Sessions so far, counting the first study. */
  reviewCount: number;
  /** Days since the latest session (fractional). */
  daysSinceLast: number;
}

const TOPICS: SeedTopic[] = [
  {
    title: "Direitos e garantias fundamentais (art. 5º)",
    subject: "Direito Constitucional",
    notes: "Remédios constitucionais: habeas corpus, habeas data, mandado de segurança, mandado de injunção e ação popular.",
    reviewCount: 4,
    daysSinceLast: 2.5,
  },
  {
    title: "Funções do 2º grau",
    subject: "Matemática",
    notes: "Vértice: x = -b/2a. Discriminante Δ = b² - 4ac decide quantas raízes reais existem.",
    reviewCount: 2,
    daysSinceLast: 2,
  },
  {
    title: "Ciclo de Krebs",
    subject: "Biologia",
    notes: "Ocorre na matriz mitocondrial. Saldo por volta: 3 NADH, 1 FADH₂, 1 GTP e 2 CO₂.",
    reviewCount: 1,
    daysSinceLast: 1.2,
  },
  {
    title: "Revolução Francesa",
    subject: "História",
    notes: "Fases: Assembleia Nacional, Convenção (Terror jacobino) e Diretório. 1789 a 1799.",
    reviewCount: 3,
    daysSinceLast: 12,
  },
  {
    title: "Estequiometria",
    subject: "Química",
    notes: "Sempre balancear a equação antes. 1 mol = 6,02 × 10²³ partículas; CNTP: 22,4 L/mol.",
    reviewCount: 1,
    daysSinceLast: 4,
  },
  {
    title: "Present Perfect vs. Simple Past",
    subject: "Inglês",
    notes: "Present Perfect: ação com ligação ao presente (have/has + particípio). Simple Past: tempo definido no passado.",
    reviewCount: 5,
    daysSinceLast: 3,
  },
  {
    title: "Leis de Newton",
    subject: "Física",
    notes: "Inércia, F = m·a e ação e reação (atuam em corpos diferentes!).",
    reviewCount: 2,
    daysSinceLast: 5,
  },
  {
    title: "Concordância verbal",
    subject: "Português",
    notes: "Sujeito posposto continua concordando com o verbo. Cuidado com 'haver' no sentido de existir (impessoal).",
    reviewCount: 3,
    daysSinceLast: 0.2,
  },
  {
    title: "Atos administrativos",
    subject: "Direito Administrativo",
    notes: "Atributos: presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade.",
    reviewCount: 2,
    daysSinceLast: 3,
  },
  {
    title: "Logaritmos",
    subject: "Matemática",
    reviewCount: 1,
    daysSinceLast: 0.5,
  },
  {
    title: "Mitose e meiose",
    subject: "Biologia",
    notes: "Meiose: duas divisões, quatro células haploides e crossing-over na prófase I.",
    reviewCount: 3,
    daysSinceLast: 20,
  },
  {
    title: "Era Vargas",
    subject: "História",
    notes: "Governo Provisório (1930–34), Constitucional (1934–37) e Estado Novo (1937–45).",
    reviewCount: 4,
    daysSinceLast: 10,
  },
];

/** Deterministic "random" delay (0–35% of the interval) so the seed is reproducible. */
function delayFactor(topicIndex: number, session: number): number {
  return ((topicIndex * 7 + session * 13) % 8) * 0.05;
}

/**
 * Replays the sessions of a topic backwards from its latest one, so that the
 * final state matches `reviewCount` and `daysSinceLast` exactly.
 */
function buildHistory(topic: SeedTopic, topicIndex: number, now: Date) {
  const sessionDates: Date[] = [addDays(now, -topic.daysSinceLast)];
  for (let session = topic.reviewCount - 1; session >= 1; session--) {
    const state = stateAfterSession(new Date(0), session);
    const gap = state.intervalDays * (1 + delayFactor(topicIndex, session));
    sessionDates.unshift(addDays(sessionDates[0], -gap));
  }

  let previous: MemoryState | null = null;
  const reviews = sessionDates.map((reviewedAt, index) => {
    const state = stateAfterSession(reviewedAt, index + 1);
    const review = {
      reviewedAt,
      outcome: "REMEMBERED" as const,
      retentionBefore: previous ? retentionAt(previous, reviewedAt) : null,
      reviewNumber: state.reviewCount,
      strengthAfter: state.strength,
      intervalDays: state.intervalDays,
    };
    previous = state;
    return review;
  });

  return { reviews, final: previous! as MemoryState, createdAt: sessionDates[0] };
}

async function main() {
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Start the demo account from scratch (topics and reviews cascade).
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await prisma.user.create({
    data: { name: "Ana Estudante", email: DEMO_EMAIL, passwordHash, timezone: "America/Sao_Paulo" },
  });

  for (const [index, topic] of TOPICS.entries()) {
    const { reviews, final, createdAt } = buildHistory(topic, index, now);
    await prisma.topic.create({
      data: {
        userId: user.id,
        title: topic.title,
        subject: topic.subject,
        notes: topic.notes ?? null,
        reviewCount: final.reviewCount,
        lastReviewedAt: final.lastReviewedAt,
        strength: final.strength,
        nextReviewAt: final.nextReviewAt,
        retention: retentionAt(final, now),
        retentionUpdatedAt: now,
        createdAt,
        reviews: { create: reviews },
      },
    });
  }

  console.log(`Seed concluído: ${TOPICS.length} tópicos para ${DEMO_EMAIL} (senha: ${DEMO_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
