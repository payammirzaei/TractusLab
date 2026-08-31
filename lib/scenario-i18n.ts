import type { Challenge, LearningScenario, ScenarioStep } from "@/lib/simulator";
import type { Locale } from "@/lib/i18n";

type ScenarioText = Partial<Pick<LearningScenario, "title" | "shortTitle" | "useCase" | "goal" | "supplierLabel" | "manufacturerLabel">>;
type StepText = Partial<Pick<ScenarioStep, "technicalName" | "question" | "business" | "architecture" | "developer" | "whyNeeded" | "withoutIt" | "actionLabel" | "payload" | "simpleExplanation" | "architectureHint" | "realWorldExample" | "keyTakeaway">>;
type ChallengeText = Partial<Pick<Challenge, "title" | "prompt" | "symptom" | "hint" | "rootCause" | "concept" | "takeaway">>;
type OptionText = Partial<Pick<Challenge["options"][number], "label" | "explanation">>;

type ScenarioTranslation = ScenarioText & {
  steps?: Record<string, StepText>;
  challenges?: Record<string, ChallengeText & { options?: Record<string, OptionText> }>;
};

const de: Record<string, ScenarioTranslation> = {
  "battery-pcf": {
    title: "Product Carbon Footprint einer Batterie teilen",
    shortTitle: "Batterie CO₂",
    useCase: "Product Carbon Footprint",
    goal: "Der Hersteller benötigt verlässliche CO₂-Daten für eine Batterie, während der Lieferant die Kontrolle über den Datenaustausch behält.",
    supplierLabel: "Batterielieferant",
    manufacturerLabel: "Fahrzeughersteller",
    steps: {
      "why-dataspace": {
        technicalName: "Dataspace",
        question: "Warum die CO₂-Datei nicht einfach per E-Mail senden?",
        business: "Beide Unternehmen brauchen einen wiederholbaren und vertrauenswürdigen Datenaustausch, ohne einer Seite unbeschränkten Zugriff auf die Systeme der anderen zu geben.",
        architecture: "Ein Dataspace schafft einen geregelten Austausch zwischen unabhängigen Unternehmen. Jeder Teilnehmer behält seine eigenen Systeme und die Hoheit über seine Daten.",
        developer: "Statt einer gemeinsamen Datenbank veröffentlichen Teilnehmer kontrollierte Angebote und tauschen Daten über Connector-Endpunkte und vereinbarte Protokolle aus.",
        whyNeeded: "So können viele Unternehmen Daten nach gemeinsamen Regeln austauschen, ohne für jeden Partner eine neue Einzelintegration zu bauen.",
        withoutIt: "Jedes Lieferanten-Kunden-Paar müsste eigene APIs, Identitätsprüfungen, Policies und Datenmodelle erfinden.",
        actionLabel: "Dataspace betreten"
      },
      "identity": {
        technicalName: "Identität & Vertrauen",
        question: "Wer fragt die Daten von BAT-12345 an?",
        business: "Bevor der Lieferant etwas teilt, muss er wissen, welches Unternehmen die Anfrage stellt und ob dieser Teilnehmer vertrauenswürdig ist.",
        architecture: "Der Consumer weist seine Teilnehmeridentität nach, bevor geschützte Angebote und Daten sichtbar werden.",
        developer: "Identitätsnachweise und Teilnehmerkennungen werden validiert, bevor der Austausch fortgesetzt wird. Die konkrete IAM-Mechanik hängt vom verwendeten Netzwerkprofil ab.",
        whyNeeded: "Der Dateneigentümer muss wissen, wer auf der anderen Seite steht, bevor Zugriffs- oder Nutzungsregeln angewendet werden.",
        withoutIt: "Jeder, der den Endpunkt findet, könnte sich als legitimer Partner ausgeben.",
        actionLabel: "Hersteller verifizieren"
      },
      "catalog": {
        technicalName: "Katalog",
        question: "Wie weiß der Hersteller, welche Daten der Lieferant anbietet?",
        business: "Zuerst wird abgefragt, welche Daten verfügbar sind. Sichtbar ist ein Angebot für den Carbon Footprint der Batterie, nicht die geschützten CO₂-Daten selbst.",
        architecture: "Der Consumer Connector fordert einen Katalog vom Provider Connector an. Die zurückgegebenen Angebote können bereits davon abhängen, wer anfragt.",
        developer: "Der Katalogaustausch liefert Asset- und Angebotsmetadaten sowie Policy-Informationen, mit denen eine Verhandlung gestartet werden kann.",
        whyNeeded: "Consumer brauchen einen standardisierten Weg, Angebote zu finden, bevor sie Daten anfordern können.",
        withoutIt: "Jeder Partner müsste manuell gepflegte Listen mit Endpunkten und Datensätzen verwalten.",
        actionLabel: "Katalog anfordern",
        payload: "Katalog → Asset BAT-12345 → Product-Carbon-Footprint-Angebot"
      },
      "semantics": {
        technicalName: "Semantisches Modell",
        question: "Wie stellen beide Unternehmen sicher, dass CO₂-Daten dasselbe bedeuten?",
        business: "Eine Zahl ist wertlos, wenn beide Unternehmen die Felder unterschiedlich interpretieren. Beide Seiten brauchen dieselbe Bedeutung und Struktur.",
        architecture: "Ein gemeinsames semantisches Modell definiert Struktur und Bedeutung der Product-Carbon-Footprint-Daten, die zwischen unterschiedlichen Systemen ausgetauscht werden.",
        developer: "Der Payload folgt einem versionierten semantischen Modell beziehungsweise Schema, damit Felder, Einheiten und Identifikatoren maschinenlesbar und interoperabel sind.",
        whyNeeded: "Interoperabilität braucht gemeinsame Bedeutung, nicht nur Konnektivität.",
        withoutIt: "Zwei technisch gültige JSON-Dokumente können trotzdem völlig unterschiedliche Dinge beschreiben.",
        actionLabel: "Gemeinsame Bedeutung festlegen"
      },
      "policy": {
        technicalName: "Policy",
        question: "Was darf der Hersteller mit den Daten tun?",
        business: "Der Lieferant kann Bedingungen an sein Angebot knüpfen, statt Zugriff nur als Ja-oder-Nein-Entscheidung zu behandeln.",
        architecture: "Das Angebot des Providers enthält Policy-Bedingungen, die geprüft werden, bevor eine Vereinbarung entsteht.",
        developer: "Das Angebot enthält maschinenlesbare Nutzungsbedingungen. Die Verhandlung gelingt nur, wenn der Consumer die geforderten Bedingungen erfüllt.",
        whyNeeded: "Datensouveränität betrifft nicht nur den Download, sondern auch die Bedingungen für die Nutzung der Daten.",
        withoutIt: "Der Lieferant kann einen Partner authentifizieren, aber keine Regeln für die Nutzung eines konkreten Angebots ausdrücken.",
        actionLabel: "Policy prüfen"
      },
      "contract": {
        technicalName: "Vertragsverhandlung",
        question: "Akzeptieren beide Seiten diese Bedingungen?",
        business: "Bevor Daten übertragen werden, machen Lieferant und Hersteller aus den angebotenen Bedingungen eine konkrete Vereinbarung für diesen Austausch.",
        architecture: "Provider- und Consumer-Connector verhandeln eine Vereinbarung auf Basis des ausgewählten Angebots und seiner Policy.",
        developer: "Eine Vertragsverhandlung durchläuft definierte Protokollzustände, bis eine Vereinbarung besteht oder die Verhandlung abgelehnt wird.",
        whyNeeded: "Der Austausch braucht eine klare Vereinbarung, die ein konkretes Angebot mit akzeptierten Bedingungen verbindet.",
        withoutIt: "Beide Seiten kennen die Policy, aber es gibt keinen vereinbarten Austauschkontext, der sie miteinander verbindet.",
        actionLabel: "Vereinbarung verhandeln"
      },
      "transfer": {
        technicalName: "Datentransfer",
        question: "Können die CO₂-Daten jetzt tatsächlich übertragen werden?",
        business: "Ja. Der Hersteller erhält die vereinbarten PCF-Daten, während die Quellsysteme des Lieferanten unter dessen Kontrolle bleiben.",
        architecture: "Nach der Vereinbarung überträgt oder exponiert ein Transferprozess die geschützten Daten über den konfigurierten Datenpfad.",
        developer: "Der Transfer wird getrennt von Katalog und Vertragsverhandlung ausgeführt. Das konkrete Data-Plane-Muster hängt von der konfigurierten Transfermethode ab.",
        whyNeeded: "Die Erlaubnis auszuhandeln und die eigentlichen Bytes zu übertragen sind zwei getrennte Verantwortlichkeiten.",
        withoutIt: "Es könnte eine gültige Vereinbarung geben, aber keinen kontrollierten Mechanismus zur Auslieferung der Daten.",
        actionLabel: "PCF-Daten übertragen",
        payload: "BAT-12345 → PCF-Payload → Fahrzeughersteller"
      }
    },
    challenges: {
      "pcf-policy-mismatch": {
        title: "Die Verhandlung wird abgelehnt",
        prompt: "Der Hersteller sieht das PCF-Angebot, aber die Vertragsverhandlung schlägt fehl. Was solltest du zuerst prüfen?",
        symptom: "Katalog ✅  Identität ✅  Vertragsverhandlung ❌",
        hint: "Das Angebot ist sichtbar, also hat Discovery funktioniert. Denke an die Bedingungen, die am Angebot hängen.",
        rootCause: "Der Consumer erfüllt mindestens eine Policy-Bedingung des Providers nicht.",
        options: {
          "dtr": { "label": "Digital Twin Registry neu aufbauen", "explanation": "Der Katalog ist bereits sichtbar. Ein fehlender Twin-Registry-Eintrag ist hier daher nicht die wahrscheinlichste Ursache." },
          "policy": { "label": "Angebots-Policy mit Consumer-Attributen vergleichen", "explanation": "Richtig. Ein sichtbares Angebot kann während der Verhandlung trotzdem scheitern, wenn seine Policy-Bedingungen nicht erfüllt sind." },
          "frontend": { "label": "Frontend neu laden", "explanation": "Die Benutzeroberfläche kann eine vom Connector abgelehnte Verhandlung nicht reparieren." }
        }
      },
      "pcf-semantic-version": {
        title: "Der Payload kommt an, kann aber nicht interpretiert werden",
        prompt: "Der Transfer funktioniert, aber die Consumer-Anwendung lehnt den PCF-Payload ab, weil Pflichtfelder nicht passen. Was solltest du als Nächstes prüfen?",
        symptom: "Transfer ✅  Anwendungsvalidierung ❌",
        hint: "Die Verbindung funktioniert. Prüfe, ob beide Systeme dieselbe Datenbedeutung und Version erwarten.",
        rootCause: "Provider und Consumer verwenden inkompatible Versionen des semantischen Modells beziehungsweise Schemas.",
        options: {
          "identity": { "label": "Teilnehmeridentität rotieren", "explanation": "Die Identitätsprüfung war bereits erfolgreich und erklärt keinen Schemafehler nach dem Transfer." },
          "semantic": { "label": "Versionen des semantischen Modells vergleichen", "explanation": "Richtig. Erfolgreicher Transport garantiert noch keine semantische Kompatibilität." },
          "catalog": { "label": "Katalog löschen", "explanation": "Der Katalog wurde nur zur Discovery des Angebots verwendet und verursacht keinen Schema-Mismatch im Payload." }
        }
      }
    }
  },
  "digital-twin": {
    title: "Digital Twin einer Komponente finden und nutzen",
    shortTitle: "Digital Twin",
    useCase: "Digital-Twin-Discovery",
    goal: "Ein Hersteller muss die digitale Repräsentation einer gelieferten Komponente finden und anschließend auf eines ihrer standardisierten Submodelle zugreifen.",
    supplierLabel: "Komponentenlieferant",
    manufacturerLabel: "Fahrzeughersteller"
  },
  "traceability": {
    title: "Ein Qualitätsproblem durch die Lieferkette zurückverfolgen",
    shortTitle: "Traceability",
    useCase: "Teile-Rückverfolgbarkeit",
    goal: "Ein Hersteller entdeckt ein Qualitätsproblem und muss herausfinden, welche gelieferten Teile betroffen sind, ohne jeden Partner nach Tabellen zu fragen.",
    supplierLabel: "Tier-1-Lieferant",
    manufacturerLabel: "Fahrzeughersteller"
  },
  "demand-capacity": {
    title: "Kurzfristige Lücke zwischen Nachfrage und Kapazität lösen",
    shortTitle: "Nachfrage & Kapazität",
    useCase: "Demand & Capacity Management",
    goal: "Ein Kunde benötigt nächste Woche mehr Einheiten und ein Lieferant muss realistische Kapazitätsdaten teilen, ohne sein gesamtes Planungssystem offenzulegen.",
    supplierLabel: "Produktionslieferant",
    manufacturerLabel: "Kunde / OEM"
  },
  "quality-management": {
    title: "Qualitätsbefund eines Lieferanten mit dem Hersteller teilen",
    shortTitle: "Qualität",
    useCase: "Qualitätsmanagement",
    goal: "Ein Lieferant erkennt ein Qualitätsproblem an einem gelieferten Teil und muss einen präzisen, verständlichen Befund teilen, ohne sein internes Qualitätssystem offenzulegen.",
    supplierLabel: "Qualitätslieferant",
    manufacturerLabel: "Fahrzeughersteller"
  },
  "circular-economy": {
    title: "Produktdaten für eine Circularity-Entscheidung nutzen",
    shortTitle: "Circular Economy",
    useCase: "Circularity / Product Passport",
    goal: "Ein nachgelagertes Unternehmen benötigt verlässliche Material- und Lebenszyklusinformationen, um zu entscheiden, ob eine Komponente wiederverwendet, repariert oder recycelt werden kann.",
    supplierLabel: "Komponentenhersteller",
    manufacturerLabel: "Recycler / Wiederverwender"
  }
};

export function localizeScenario(scenario: LearningScenario, locale: Locale): LearningScenario {
  if (locale === "en") return scenario;
  const translation = de[scenario.id];
  if (!translation) return scenario;

  const { steps: stepTranslations, challenges: challengeTranslations, ...scenarioText } = translation;

  return {
    ...scenario,
    ...scenarioText,
    steps: scenario.steps.map((step) => ({
      ...step,
      ...(stepTranslations?.[step.id] ?? {}),
    })),
    challenges: scenario.challenges.map((challenge) => {
      const translated = challengeTranslations?.[challenge.id];
      if (!translated) return challenge;
      const { options, ...challengeText } = translated;
      return {
        ...challenge,
        ...challengeText,
        options: challenge.options.map((option) => ({
          ...option,
          ...(options?.[option.id] ?? {}),
        })),
      };
    }),
  };
}

export function localizeScenarios(scenarios: LearningScenario[], locale: Locale): LearningScenario[] {
  return scenarios.map((scenario) => localizeScenario(scenario, locale));
}
