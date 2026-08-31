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
    manufacturerLabel: "Fahrzeughersteller",
    steps: {
      "physical-to-digital": {
        technicalName: "Digital Twin",
        question: "Wie beziehen wir uns unternehmensübergreifend auf dieselbe reale Komponente?",
        business: "Die physische Komponente braucht eine stabile digitale Repräsentation, auf die Partner verweisen können, ohne die interne Datenbank des Lieferanten zu teilen.",
        architecture: "Ein Digital-Twin-Descriptor verbindet die Asset-Identität mit auffindbaren digitalen Informationen und Submodel-Endpunkten.",
        developer: "Der Twin nutzt standardisierte Identifikatoren und Descriptoren, statt interne Primärschlüssel oder Datenbankstrukturen offenzulegen.",
        whyNeeded: "Partner brauchen einen gemeinsamen digitalen Bezugspunkt für dasselbe reale Asset.",
        withoutIt: "Jedes Unternehmen müsste eigene Identifier-Mappings und Integrationslogik bauen.",
        actionLabel: "Digitale Identität erzeugen"
      },
      "register-twin": {
        technicalName: "Digital Twin Registry",
        question: "Wo können Partner diesen Twin finden?",
        business: "Der Lieferant registriert einen Descriptor, damit ein berechtigter Partner die digitale Repräsentation und ihre Submodelle finden kann.",
        architecture: "Die Digital Twin Registry speichert Descriptoren und auffindbare Referenzen, nicht den kompletten Geschäftsdatenbestand.",
        developer: "Anwendungen fragen die DTR nach standardisierten Shell- und Submodel-Descriptoren sowie Endpunkt-Metadaten ab.",
        whyNeeded: "Discovery muss von der internen Speicherstruktur jeder Lieferantenanwendung getrennt sein.",
        withoutIt: "Consumer müssten die Twin-Endpunkte jedes Lieferanten fest im Code kennen.",
        actionLabel: "Twin registrieren"
      },
      "submodel": {
        technicalName: "Submodel",
        question: "Welchen Teil des Twins braucht der Hersteller?",
        business: "Ein Twin kann verschiedene Geschäftsaspekte anbieten. Der Hersteller benötigt nur den für seine Aufgabe relevanten Aspekt.",
        architecture: "Submodel-Descriptoren trennen die Aspekte eines Assets und zeigen auf die zugehörigen Datenendpunkte.",
        developer: "Der Descriptor enthält semantische Identifikatoren und Endpunktinformationen, mit denen ein Client den gewünschten Aspekt auflösen kann.",
        whyNeeded: "Ein einziger großer, unstrukturierter Twin-Payload wäre über verschiedene Use Cases kaum wiederverwendbar.",
        withoutIt: "Jeder Consumer müsste einen lieferantenspezifischen monolithischen Payload verstehen.",
        actionLabel: "Submodel auswählen"
      },
      "semantic-model": {
        technicalName: "Semantisches Modell",
        question: "Woher weiß der Consumer, was die Felder des Submodels bedeuten?",
        business: "Beide Unternehmen brauchen ein gemeinsames Vokabular und eine gemeinsame Struktur für den ausgewählten Aspekt.",
        architecture: "Das Submodel verweist auf ein semantisches Modell, das interoperable Bedeutung über verschiedene Implementierungen hinweg definiert.",
        developer: "Semantischer Identifier und Version zeigen Clients, welches maschinenlesbare Schema und welche Semantik zu erwarten sind.",
        whyNeeded: "Discovery sagt, wo Daten liegen; Semantik sagt, was sie bedeuten.",
        withoutIt: "Der Endpunkt ist erreichbar, aber der Consumer kann seine Felder nicht zuverlässig interpretieren.",
        actionLabel: "Semantik auflösen"
      },
      "controlled-access": {
        technicalName: "EDC-geregelter Zugriff",
        question: "Kann der Hersteller den Submodel-Endpunkt jetzt einfach aufrufen?",
        business: "Nicht unbedingt. Den Twin zu finden bedeutet noch nicht, dass geschützte Geschäftsdaten gelesen werden dürfen.",
        architecture: "Der Descriptor kann zu Daten führen, die weiterhin durch Connector-Identität, Policy, Vereinbarung und Transferregeln geschützt sind.",
        developer: "Twin-Discovery und geschützter Datenaustausch sind getrennte Abläufe. Vor dem eigentlichen Zugriff kann eine EDC-Verhandlung nötig sein.",
        whyNeeded: "Daten zu finden und sie nutzen zu dürfen sind zwei verschiedene Fragen.",
        withoutIt: "Ein auffindbarer Twin könnte versehentlich bedeuten, dass auch die geschützten Daten öffentlich sind.",
        actionLabel: "Kontrollierten Zugriff anfordern"
      }
    },
    challenges: {
      "twin-not-found": {
        title: "Der Komponenten-Twin wird nicht gefunden",
        prompt: "Die Komponente existiert im ERP des Lieferanten, aber der Consumer findet keinen Twin-Descriptor. Wo solltest du zuerst nachsehen?",
        symptom: "Physisches Asset ✅  DTR-Suche ❌",
        hint: "Ein ERP-Eintrag ist nicht automatisch eine Dataspace-Twin-Registrierung.",
        rootCause: "Der Twin-Descriptor fehlt oder ist in der Digital Twin Registry unter dem falschen Asset-Identifier registriert.",
        options: {
          "dtr": { "label": "DTR-Registrierung und Asset-Identifier prüfen", "explanation": "Richtig. Discovery funktioniert nur mit einem gültigen Descriptor unter dem erwarteten Identifier." },
          "policy": { "label": "Transfer-Policy neu schreiben", "explanation": "Die Transfer-Policy wird später relevant; aktuell wird der Twin noch gar nicht gefunden." },
          "pcf": { "label": "Carbon Footprint neu berechnen", "explanation": "Die PCF-Berechnung hat nichts mit dem Auffinden des Twin-Descriptors zu tun." }
        }
      },
      "wrong-semantic-id": {
        title: "Der falsche Aspekt wird aufgelöst",
        prompt: "Der Twin wird gefunden, aber die Anwendung wählt ein Submodel mit unerwarteter Struktur. Was sollte geprüft werden?",
        symptom: "DTR-Suche ✅  Submodel-Parsing ❌",
        hint: "Der Descriptor sagt dem Client, welcher semantischen Definition ein Aspekt folgt.",
        rootCause: "Der Submodel-Descriptor verweist auf den falschen semantischen Identifier oder die falsche Version.",
        options: {
          "semantic-id": { "label": "semanticId und Modellversion prüfen", "explanation": "Richtig. Ein falscher semantischer Identifier führt dazu, dass die Anwendung die falsche Struktur erwartet." },
          "dns": { "label": "Öffentliches DNS ändern", "explanation": "Der Twin wurde bereits gefunden. DNS erklärt keinen Mismatch der Aspektstruktur." },
          "identity": { "label": "Neue Unternehmensidentität erzeugen", "explanation": "Identität ist nicht die erste Erklärung für einen semantischen Strukturfehler." }
        }
      }
    }
  },
  "traceability": {
    title: "Ein Qualitätsproblem durch die Lieferkette zurückverfolgen",
    shortTitle: "Traceability",
    useCase: "Teile-Rückverfolgbarkeit",
    goal: "Ein Hersteller entdeckt ein Qualitätsproblem und muss herausfinden, welche gelieferten Teile betroffen sind, ohne jeden Partner nach Tabellen zu fragen.",
    supplierLabel: "Tier-1-Lieferant",
    manufacturerLabel: "Fahrzeughersteller",
    steps: {
      "quality-event": {
        technicalName: "Qualitätsereignis",
        question: "Ein Defekt wurde gefunden. Was ist die erste sinnvolle Frage?",
        business: "Der Hersteller muss zuerst den betroffenen Batch oder das serialisierte Teil identifizieren. Ohne konkretes Asset bleibt nur ein unscharfer Alarm auf Lieferantenebene.",
        architecture: "Ein Qualitätsereignis wird an einen Asset-Identifier gebunden, dem man über digitale Repräsentationen und Teilebeziehungen folgen kann.",
        developer: "Die Anwendung startet mit einem bekannten Batch- oder Serien-Identifier und nutzt standardisierte Asset-Daten als Ausgangspunkt der Untersuchung.",
        whyNeeded: "Ein präziser Asset-Identifier macht aus einem allgemeinen Qualitätsproblem eine nachvollziehbare Untersuchung.",
        withoutIt: "Teams suchen manuell in E-Mails, ERP-Exports und Lieferantentabellen.",
        actionLabel: "Betroffenen Batch identifizieren",
        payload: "Qualitätsereignis → BATCH-7A42"
      },
      "relationships": {
        technicalName: "Teilebeziehungen",
        question: "Welche Komponenten hängen mit diesem betroffenen Teil zusammen?",
        business: "Der Hersteller muss sehen, was in das Teil eingeflossen ist und wo es verbaut wurde, um die mögliche Auswirkung schnell einzugrenzen.",
        architecture: "Standardisierte Stücklisten- und Verwendungsbeziehungen verbinden Parent- und Child-Assets über die Lieferkette hinweg.",
        developer: "Traceability-Anwendungen lösen standardisierte As-built-Beziehungen auf, statt lieferantenspezifische Relationstabellen zu verwenden.",
        whyNeeded: "Qualitätsauswirkungen entstehen durch Beziehungen, nicht nur durch einzelne Teileeinträge.",
        withoutIt: "Der Defekt ist bekannt, aber Upstream- und Downstream-Assets lassen sich nicht zuverlässig verbinden.",
        actionLabel: "Teilebaum verfolgen"
      },
      "partner-data": {
        technicalName: "Souveräner Datenzugriff",
        question: "Was passiert, wenn manche Beziehungen einem anderen Unternehmen gehören?",
        business: "Der Hersteller braucht keinen Direktzugriff auf das ERP des Lieferanten. Er fordert nur die Daten an, deren Freigabe vereinbart wurde.",
        architecture: "Unternehmensübergreifende Traceability nutzt kontrollierten Dataspace-Austausch zwischen Provider- und Consumer-Connectoren.",
        developer: "Der Consumer findet ein Angebot, erfüllt dessen Policy und erhält die erlaubten Traceability-Daten über den Connector-Ablauf.",
        whyNeeded: "Ein Lieferketten-Graph umfasst mehrere Unternehmen, die trotzdem die Kontrolle über ihre Systeme behalten müssen.",
        withoutIt: "Traceability endet an Unternehmensgrenzen oder erfordert zentrale Kopien sensibler Partnerdaten.",
        actionLabel: "Lieferantenbeziehungen anfordern"
      },
      "shared-meaning": {
        technicalName: "Standardisierte Semantik",
        question: "Wie können verschiedene Unternehmen Teilebeziehungen konsistent beschreiben?",
        business: "Lieferant und Hersteller können intern unterschiedliche Namen nutzen, aber die ausgetauschten Beziehungsdaten brauchen eine gemeinsame Bedeutung.",
        architecture: "Semantische Modelle definieren interoperable Strukturen für Teile- und Beziehungsinformationen.",
        developer: "Der Payload folgt vereinbarten Aspect-Model-Identifiern und Versionen, damit Beziehungsfelder konsistent verarbeitet werden.",
        whyNeeded: "Ein Graph ist nur nützlich, wenn alle unter Parent, Child, Batch und Seriennummer dasselbe verstehen.",
        withoutIt: "Die Daten kommen an, benötigen aber für jeden Partner eigene Übersetzungslogik.",
        actionLabel: "Beziehungsmodell angleichen"
      },
      "impact": {
        technicalName: "Auswirkungsanalyse",
        question: "Was kann der Hersteller jetzt tatsächlich herausfinden?",
        business: "Das Unternehmen kann dem betroffenen Batch durch verbundene Teile folgen und erkennen, welche Produkte, Lieferanten oder Kunden Maßnahmen benötigen.",
        architecture: "Traceability-Anwendungen kombinieren gefundene Digital Twins, standardisierte Beziehungen und kontrollierte Partnerdaten zu einer Lieferkettensicht.",
        developer: "Die Anwendung traversiert den verfügbaren Beziehungsgraphen und erhält die Herkunft der verwendeten Assets und Partnerdaten.",
        whyNeeded: "Geschäftswert entsteht, wenn technischer Austausch zu einer schnellen und erklärbaren Impact-Analyse wird.",
        withoutIt: "Daten werden zwar ausgetauscht, aber die Incident-Reaktion bleibt manuelle Koordination.",
        actionLabel: "Betroffene Kette anzeigen",
        payload: "BATCH-7A42 → Lieferantenkomponente → Baugruppe → betroffene Fahrzeuge"
      }
    },
    challenges: {
      "missing-relation": {
        title: "Die Rückverfolgung stoppt bei einer Lieferantenkomponente",
        prompt: "Der betroffene Batch wurde gefunden, aber die Anwendung kommt nicht zu den Child-Komponenten weiter. Was prüfst du zuerst?",
        symptom: "Asset gefunden ✅  Beziehungs-Traversierung ❌",
        hint: "Das Teil existiert. Es fehlt die Verbindung zwischen diesem Teil und den nächsten Assets.",
        rootCause: "Die erwarteten As-built-Beziehungsdaten fehlen, sind unvollständig oder mit dem falschen Asset-Identifier verknüpft.",
        options: {
          "relationship": { "label": "Beziehungsdaten und Asset-Identifier prüfen", "explanation": "Richtig. Die Traversierung braucht gültige Parent-/Child-Beziehungen zu den erwarteten Assets." },
          "pcf": { "label": "Product Carbon Footprint neu berechnen", "explanation": "Eine Carbon-Footprint-Berechnung repariert keine fehlenden Teilebeziehungen." },
          "frontend": { "label": "Seitenlayout ändern", "explanation": "Eine UI-Änderung kann fehlende Beziehungsdaten nicht erzeugen." }
        }
      },
      "supplier-boundary": {
        title: "Der Graph stoppt an der Unternehmensgrenze",
        prompt: "Interne Beziehungen sind sichtbar, aber Traceability-Daten des Lieferanten werden nicht geladen. Was ist der beste nächste Check?",
        symptom: "Interner Graph ✅  Partnerdaten ❌",
        hint: "Der Fehler erscheint genau dann, wenn die Untersuchung in kontrollierte Daten eines anderen Teilnehmers wechselt.",
        rootCause: "Das Partnerangebot ist nicht verfügbar oder der Consumer erfüllt die für den Zugriff erforderliche Policy nicht.",
        options: {
          "access": { "label": "Katalogangebot, Vereinbarung und Policy prüfen", "explanation": "Richtig. Unternehmensübergreifende Daten benötigen weiterhin einen gültigen kontrollierten Austausch." },
          "database": { "label": "Direkte Datenbank-Zugangsdaten anfordern", "explanation": "Das würde das Dataspace-Modell umgehen und ist nicht der vorgesehene Traceability-Ablauf." },
          "identity-map": { "label": "Batch-Anzeige im UI umbenennen", "explanation": "Ein anderer Anzeigename schafft keine Berechtigung zum Laden von Partnerdaten." }
        }
      }
    }
  },
  "demand-capacity": {
    title: "Kurzfristige Lücke zwischen Nachfrage und Kapazität lösen",
    shortTitle: "Nachfrage & Kapazität",
    useCase: "Demand & Capacity Management",
    goal: "Ein Kunde benötigt nächste Woche mehr Einheiten und ein Lieferant muss realistische Kapazitätsdaten teilen, ohne sein gesamtes Planungssystem offenzulegen.",
    supplierLabel: "Produktionslieferant",
    manufacturerLabel: "Kunde / OEM",
    steps: {
      "demand-signal": {
        technicalName: "Nachfragesignal",
        question: "Was hat sich auf Kundenseite geändert?",
        business: "Der Kunde benötigt in einem bestimmten Zeitraum mehr Einheiten von PART-AX19. Der Lieferant braucht ein klares Nachfragesignal, bevor er reagieren kann.",
        architecture: "Nachfrage wird als strukturierte Geschäftsinformation dargestellt, die zwischen unabhängigen Planungssystemen ausgetauscht werden kann.",
        developer: "Der Ablauf beginnt mit einem maschinenlesbaren Demand-Payload aus Teil, Menge und Zeitraum statt mit E-Mail oder Spreadsheet.",
        whyNeeded: "Kapazitätsplanung funktioniert nur, wenn beide Seiten über dasselbe Teil, dieselbe Menge und denselben Zeitraum sprechen.",
        withoutIt: "Teams koordinieren Engpässe über Anrufe und Tabellen, die schnell veralten.",
        actionLabel: "Nachfragesignal senden",
        payload: "PART-AX19 → +1.500 Einheiten → nächste Woche"
      },
      "capacity-picture": {
        technicalName: "Kapazitätsinformation",
        question: "Was kann der Lieferant realistisch produzieren?",
        business: "Der Lieferant antwortet mit der Kapazität, die er für dasselbe Teil und denselben Zeitraum zusagen kann, ohne seine komplette Produktionsplanung zu öffnen.",
        architecture: "Der Provider stellt nur die vereinbarte Planungsinformation als kontrolliertes Datenangebot bereit.",
        developer: "Kapazitätsdaten werden als begrenzter Geschäftspayload vorbereitet und über die Provider-Seite des Dataspaces angeboten.",
        whyNeeded: "Der Kunde braucht eine entscheidungsfähige Kapazitätssicht, keinen uneingeschränkten Zugriff auf das Planungssystem des Lieferanten.",
        withoutIt: "Entweder erhält der Kunde zu wenig Information oder der Lieferant gibt zu viele operative Daten preis.",
        actionLabel: "Kapazitätsdaten vorbereiten"
      },
      "shared-planning-model": {
        technicalName: "Gemeinsame Semantik",
        question: "Wie interpretieren beide Systeme Menge und Zeit gleich?",
        business: "Eine Nachfrage von 1.500 ist wertlos, wenn ein System Stück pro Tag und das andere Stück pro Woche meint. Planungsdaten brauchen gemeinsame Bedeutung.",
        architecture: "Standardisierte semantische Modelle gleichen Struktur und Bedeutung von Nachfrage-, Liefer- und Kapazitätsinformationen ab.",
        developer: "Provider und Consumer validieren den Planungspayload gegen das vereinbarte semantische Modell und dessen Version, bevor Werte verglichen werden.",
        whyNeeded: "Planungsentscheidungen brauchen vergleichbare Werte, Einheiten und Zeiträume über Unternehmenssysteme hinweg.",
        withoutIt: "Der technische Austausch funktioniert, aber der geschäftliche Vergleich ist trotzdem falsch.",
        actionLabel: "Planungsbedeutung angleichen"
      },
      "controlled-planning-exchange": {
        technicalName: "Kontrollierter Austausch",
        question: "Soll jeder Kunde diese Lieferantenkapazität sehen?",
        business: "Nein. Kapazität kann geschäftlich sensibel sein, daher entscheidet der Lieferant, welcher Teilnehmer welche Planungsinformation erhält.",
        architecture: "Identität, Katalogsichtbarkeit, Policy und Vereinbarung steuern den Austausch, bevor Kapazitätsdaten geliefert werden.",
        developer: "Der Consumer findet das relevante Angebot und erfüllt dessen Policy, bevor der Transferprozess den Kapazitätspayload freigibt.",
        whyNeeded: "Sensible Planungsinformation braucht dieselben Datensouveränitätskontrollen wie andere unternehmensübergreifende Daten.",
        withoutIt: "Eine nützliche Planungs-API kann unbeabsichtigt zu einer unkontrollierten Quelle sensibler Informationen werden.",
        actionLabel: "Austausch autorisieren"
      },
      "shortfall": {
        technicalName: "Nachfrage-Kapazitäts-Vergleich",
        question: "Welche Entscheidung können die Unternehmen jetzt treffen?",
        business: "Sie vergleichen angeforderte Menge und verfügbare Kapazität, erkennen die Lücke und koordinieren einen neuen Plan, bevor der Engpass die Produktion stoppt.",
        architecture: "Die Anwendung kombiniert standardisierte Nachfrage- und Kapazitätsdaten nach dem kontrollierten Austausch zu einer gemeinsamen Planungssicht.",
        developer: "Die Consumer-Anwendung gleicht Teile-Identifier und Zeitfenster ab, berechnet die Lücke und kann den Austausch bei Änderungen wiederholen.",
        whyNeeded: "Das Ziel ist nicht nur Datentransfer, sondern das frühere Erkennen und Lösen von Lieferrisiken.",
        withoutIt: "Der gleiche Engpass wird erst durch verspätete Lieferungen oder Produktionsunterbrechungen sichtbar.",
        actionLabel: "Lücke berechnen",
        payload: "Nachfrage 5.000 − Kapazität 4.200 = Fehlmenge 800 Einheiten"
      }
    },
    challenges: {
      "wrong-time-bucket": {
        title: "Die Zahlen wirken unmöglich",
        prompt: "Der Lieferant meldet 4.200 Einheiten Kapazität und der Kunde 5.000 Einheiten Nachfrage, aber die Anwendungen berechnen unterschiedliche Fehlmengen. Was prüfst du zuerst?",
        symptom: "Austausch ✅  Werte empfangen ✅  Vergleich ❌",
        hint: "Schau darauf, wie jede Seite Zeitraum und Einheit hinter der Zahl definiert.",
        rootCause: "Die Systeme vergleichen unterschiedliche Einheiten oder Zeitfenster, weil ihre semantischen Erwartungen nicht übereinstimmen.",
        options: {
          "semantics": { "label": "Einheiten, Zeitfenster und Modellversionen vergleichen", "explanation": "Richtig. Erfolgreicher Transfer kann zu falscher Planung führen, wenn die Werte unterschiedliche Bedeutungen haben." },
          "dns": { "label": "Connector-DNS ändern", "explanation": "Die Verbindung funktioniert bereits. DNS erklärt keinen Mismatch der Geschäftswerte." },
          "identity": { "label": "Neue Teilnehmeridentität erstellen", "explanation": "Identität hat den Austausch bereits ermöglicht und behebt keine inkompatible Planungssemantik." }
        }
      },
      "capacity-offer-hidden": {
        title: "Der Kunde sieht das Kapazitätsangebot nicht",
        prompt: "Der Lieferant sagt, dass der Kapazitätsdatensatz existiert, aber dieser Kunde findet das Angebot nicht. Was sollte geprüft werden?",
        symptom: "Lieferantendatensatz ✅  Kunden-Katalogangebot ❌",
        hint: "Kataloge können teilnehmerabhängig sein. Denke an Identität und Regeln zur Sichtbarkeit des Angebots.",
        rootCause: "Der Kunde ist für das Angebot nicht berechtigt, weil Identität oder Policy-relevante Attribute nicht zu den Zugriffsregeln des Providers passen.",
        options: {
          "visibility": { "label": "Teilnehmeridentität und Zugriffs-Policy prüfen", "explanation": "Richtig. Ein Provider kann je nach anfragendem Teilnehmer unterschiedliche Angebote zeigen." },
          "spreadsheet": { "label": "Kompletten Produktionsplan per E-Mail senden", "explanation": "Das umgeht den kontrollierten Austausch, statt ihn zu diagnostizieren." },
          "pcf": { "label": "PCF-Modell aktualisieren", "explanation": "Carbon-Footprint-Semantik hat nichts mit der Sichtbarkeit eines Kapazitätsangebots zu tun." }
        }
      }
    }
  },
  "quality-management": {
    title: "Qualitätsbefund eines Lieferanten mit dem Hersteller teilen",
    shortTitle: "Qualität",
    useCase: "Qualitätsmanagement",
    goal: "Ein Lieferant erkennt ein Qualitätsproblem an einem gelieferten Teil und muss einen präzisen, verständlichen Befund teilen, ohne sein internes Qualitätssystem offenzulegen.",
    supplierLabel: "Qualitätslieferant",
    manufacturerLabel: "Fahrzeughersteller",
    steps: {
      "quality-finding": {
        technicalName: "Qualitätsbefund",
        question: "Was wurde am gelieferten Teil genau gefunden?",
        business: "Der Lieferant startet mit einem konkreten Qualitätsbefund zu einem realen Teil oder Batch, nicht mit einer vagen Nachricht, dass vielleicht etwas nicht stimmt.",
        architecture: "Die Qualitätsanwendung erzeugt einen strukturierten Befund, der an einen bekannten Asset-Identifier gebunden ist.",
        developer: "Die Quellanwendung liefert ein maschinenlesbares Ergebnis mit Asset-Identifier, Befundtyp, Zeitstempel und Evidenzreferenzen statt einer Freitext-E-Mail.",
        whyNeeded: "Eine Qualitätsentscheidung ist nur nützlich, wenn alle wissen, auf welches Asset und welche Beobachtung sie sich bezieht.",
        withoutIt: "Teams müssen erst Screenshots, Ticketnummern und ERP-Einträge zusammenbringen, bevor sie über denselben Defekt sprechen.",
        actionLabel: "Befund an das Teil binden",
        payload: "PART-QA-204 → Oberflächenanomalie → Prüfergebnis"
      },
      "shared-quality-meaning": {
        technicalName: "Standardisierte Qualitätssemantik",
        question: "Woher weiß der Hersteller, was der Befund bedeutet?",
        business: "Ein Defektlabel hilft nur, wenn beide Unternehmen Felder, Status und Evidenz gleich interpretieren.",
        architecture: "Ein gemeinsames semantisches Modell gibt dem Qualitätspayload über Lieferanten- und Herstelleranwendungen hinweg dieselbe Struktur und Bedeutung.",
        developer: "Das Ergebnis folgt einem vereinbarten semantischen Identifier und einer Modellversion, damit Anwendungen Felder und Einheiten konsistent validieren.",
        whyNeeded: "Konnektivität bewegt Daten; Semantik macht sie interoperabel.",
        withoutIt: "Der Payload kommt an, braucht aber für jeden Partner eigene Übersetzung.",
        actionLabel: "Qualitätsmodell angleichen"
      },
      "discover-quality-offer": {
        technicalName: "Katalogangebot",
        question: "Wie fordert der Hersteller Qualitätsdaten an, ohne die interne API des Lieferanten zu kennen?",
        business: "Der Lieferant stellt ein auffindbares Angebot für die erlaubten Qualitätsinformationen bereit, statt Direktzugriff auf seine Qualitätsdatenbank zu geben.",
        architecture: "Der Provider Connector veröffentlicht ein Angebot, das der Consumer Connector über den Dataspace-Katalog finden kann.",
        developer: "Der Consumer fragt den Provider-Katalog ab, wählt das zum Asset oder Qualitätsdatensatz gehörende Angebot und bereitet die Verhandlung vor.",
        whyNeeded: "Partner brauchen einen wiederholbaren Discovery-Mechanismus unabhängig von internen Anwendungs-URLs.",
        withoutIt: "Jeder Qualitätsaustausch wird zu einer weiteren manuell gepflegten Punkt-zu-Punkt-Integration.",
        actionLabel: "Qualitätsangebot finden"
      },
      "quality-policy": {
        technicalName: "Nutzungs-Policy",
        question: "Darf der Hersteller diesen Befund für jeden Zweck verwenden?",
        business: "Der Lieferant kann festlegen, welcher Teilnehmer auf das Ergebnis zugreifen darf und unter welchen Geschäftsbedingungen es genutzt werden kann.",
        architecture: "Der Provider hängt Policy-Bedingungen an das Qualitätsdaten-Angebot; die Connectoren prüfen sie vor der Vereinbarung.",
        developer: "Die Verhandlung gelingt nur, wenn Identität und Attribute des Consumers die maschinenlesbaren Bedingungen des Angebots erfüllen.",
        whyNeeded: "Qualitätsdaten können geschäftlich sensibel sein, auch wenn der Empfänger ein legitimer Partner ist.",
        withoutIt: "Authentifizierung sagt, wer der Partner ist, aber nicht, was er mit einem konkreten Datensatz tun darf.",
        actionLabel: "Nutzungsregeln prüfen"
      },
      "quality-transfer": {
        technicalName: "Kontrollierter Datentransfer",
        question: "Wie erreicht das Qualitätsergebnis jetzt den Hersteller?",
        business: "Nach akzeptierter Vereinbarung erhält der Hersteller das Qualitätsergebnis, während das Quellsystem beim Lieferanten unter dessen Kontrolle bleibt.",
        architecture: "Der Connector-Ablauf trennt Vereinbarung und Lieferung und stellt nur den durch das verhandelte Angebot abgedeckten Datenpfad bereit.",
        developer: "Ein Transferprozess liefert oder exponiert den Qualitätspayload nach der Vereinbarung über das konfigurierte Data-Plane-Muster.",
        whyNeeded: "Berechtigung und Byte-Transfer sind getrennte Verantwortlichkeiten und sollten unabhängig fehlschlagen können.",
        withoutIt: "Eine gültige Vereinbarung existiert, aber es gibt keinen geregelten Mechanismus zur Lieferung der Qualitätsdaten.",
        actionLabel: "Qualitätsergebnis übertragen",
        payload: "PART-QA-204 → standardisiertes Qualitätsergebnis → Hersteller"
      }
    },
    challenges: {
      "quality-schema-mismatch": {
        title: "Das Ergebnis kommt an, aber die Anwendung lehnt es ab",
        prompt: "Der Transport war erfolgreich, aber der Hersteller kann das Qualitätsergebnis nicht parsen. Was solltest du zuerst vergleichen?",
        symptom: "Transfer ✅  Anwendungsvalidierung ❌",
        hint: "Die Bytes sind angekommen. Prüfe, ob beide Seiten dieselbe Bedeutung und Struktur erwartet haben.",
        rootCause: "Lieferant und Hersteller verwenden inkompatible Versionen des semantischen Modells oder Schemas.",
        options: {
          "semantics": { "label": "Semantischen Identifier und Modellversion vergleichen", "explanation": "Richtig. Erfolgreicher Transport garantiert keine semantische Kompatibilität." },
          "identity": { "label": "Neue Teilnehmeridentität erstellen", "explanation": "Identität war bereits vor dem Transfer erfolgreich und erklärt keinen Schemafehler." },
          "ui": { "label": "Qualitätsdashboard neu laden", "explanation": "Ein UI-Reload repariert keine inkompatible Payload-Struktur." }
        }
      },
      "quality-policy-rejected": {
        title: "Das Qualitätsangebot ist sichtbar, aber die Verhandlung scheitert",
        prompt: "Der Hersteller kann das Qualitätsangebot finden, doch es entsteht keine Vereinbarung. Was ist der beste nächste Check?",
        symptom: "Katalog ✅  Verhandlung ❌",
        hint: "Discovery hat funktioniert. Prüfe die Bedingungen am ausgewählten Angebot.",
        rootCause: "Der Consumer erfüllt mindestens eine Policy-Bedingung des Qualitätsdaten-Angebots nicht.",
        options: {
          "policy": { "label": "Angebots-Policy mit Consumer-Attributen vergleichen", "explanation": "Richtig. Ein sichtbares Angebot kann bei der Policy-Prüfung trotzdem abgelehnt werden." },
          "dtr": { "label": "Digital-Twin-Registry-Eintrag löschen", "explanation": "Der aktuelle Fehler liegt in der Verhandlung, nicht in der Twin-Discovery." },
          "database": { "label": "Direkte Datenbank-Zugangsdaten teilen", "explanation": "Das umgeht den kontrollierten Dataspace-Austausch und ist nicht die vorgesehene Lösung." }
        }
      }
    }
  },
  "circular-economy": {
    title: "Produktdaten für eine Circularity-Entscheidung nutzen",
    shortTitle: "Circular Economy",
    useCase: "Circularity / Product Passport",
    goal: "Ein nachgelagertes Unternehmen benötigt verlässliche Material- und Lebenszyklusinformationen, um zu entscheiden, ob eine Komponente wiederverwendet, repariert oder recycelt werden kann.",
    supplierLabel: "Komponentenhersteller",
    manufacturerLabel: "Recycler / Wiederverwender",
    steps: {
      "asset-identity": {
        technicalName: "Asset-Identität",
        question: "Über welche physische Komponente sprechen wir?",
        business: "Bevor eine Wiederverwendungs- oder Recyclingentscheidung möglich ist, muss die physische Komponente mit einer stabilen digitalen Identität verbunden sein.",
        architecture: "Eine Digital-Twin-Repräsentation gibt der Komponente einen auffindbaren digitalen Bezugspunkt für Lebenszyklus- und Materialinformationen.",
        developer: "Anwendungen nutzen standardisierte Asset-Identifier und Twin-Descriptoren statt interner Primärschlüssel eines einzelnen Unternehmens.",
        whyNeeded: "Circularity-Entscheidungen hängen von Historie und Zusammensetzung eines konkreten Assets ab, nicht nur vom Produktfamiliennamen.",
        withoutIt: "Material- und Lebenszyklusdaten lassen sich nicht zuverlässig mit der Komponente vor dem Operator verbinden.",
        actionLabel: "Komponente identifizieren"
      },
      "discover-passport": {
        technicalName: "Twin- & Passport-Discovery",
        question: "Wo findet das nachgelagerte Unternehmen die Komponenteninformationen?",
        business: "Es braucht eine auffindbare Referenz auf die digitalen Informationen der Komponente, statt den Hersteller nach einem PDF zu fragen.",
        architecture: "Die Digital Twin Registry hilft, den Asset-Descriptor und relevante Lebenszyklus- oder Passport-Submodelle aufzulösen.",
        developer: "Der Client fragt die DTR mit dem erwarteten Asset-Identifier ab und löst Descriptoren mit Submodel-Endpunkten und semantischen Referenzen auf.",
        whyNeeded: "Discovery trennt das Wissen darüber, wo Information zu finden ist, von der internen Datenspeicherung des Herstellers.",
        withoutIt: "Jeder Partner braucht ein manuell gepflegtes Verzeichnis herstellerspezifischer Endpunkte.",
        actionLabel: "Digitale Repräsentation finden"
      },
      "material-semantics": {
        technicalName: "Gemeinsame Materialsemantik",
        question: "Wie verstehen beide Seiten Material- und Lebenszyklusfelder gleich?",
        business: "Felder wie Material, Rezyklatanteil oder Servicestatus helfen nur, wenn beide Systeme sie konsistent interpretieren.",
        architecture: "Semantische Modelle definieren die gemeinsame Struktur und Bedeutung der Circularity-bezogenen Submodel-Daten.",
        developer: "Der Submodel-Descriptor verweist auf einen semantischen Identifier und eine Modellversion, die der Consumer zur Validierung nutzt.",
        whyNeeded: "Circularity braucht interoperable Bedeutung über Unternehmen, Softwareanbieter und Lebenszyklusphasen hinweg.",
        withoutIt: "Die Daten sind erreichbar, aber automatisierte Wiederverwendungs- oder Recyclingentscheidungen brauchen weiterhin partnerspezifische Mapping-Regeln.",
        actionLabel: "Datenbedeutung auflösen"
      },
      "controlled-passport-access": {
        technicalName: "Kontrollierter Zugriff",
        question: "Bedeutet ein auffindbarer Passport, dass alle Daten öffentlich sind?",
        business: "Nein. Einige Informationen können auffindbar sein, während sensible Lebenszyklus- oder Materialdetails nur autorisierten Partnern offenstehen.",
        architecture: "Der Twin kann auf geschützte Daten zeigen, die weiterhin Connector-Identität, Katalog-Discovery, Policy-Prüfung und Vereinbarung benötigen.",
        developer: "Der Consumer nutzt für das ausgewählte Angebot den geschützten EDC-Ablauf und nimmt nicht an, dass der gefundene Endpunkt anonym erreichbar ist.",
        whyNeeded: "Auffindbarkeit und Berechtigung sind unterschiedliche Anliegen.",
        withoutIt: "Hersteller müssten zwischen komplett versteckten Informationen und unkontrolliert offengelegten sensiblen Daten wählen.",
        actionLabel: "Geschützte Daten anfordern"
      },
      "circular-decision": {
        technicalName: "Circularity-Entscheidung",
        question: "Welche Geschäftsentscheidung kann das nachgelagerte Unternehmen jetzt treffen?",
        business: "Mit vertrauenswürdiger Identität, interpretierbaren Produktdaten und kontrolliertem Zugriff kann entschieden werden, ob die Komponente wiederverwendet, repariert, aufgearbeitet oder recycelt wird.",
        architecture: "Die nachgelagerte Anwendung kombiniert gefundene Twin-Informationen, standardisierte Semantik und geregelte Partnerdaten zu einer Lebenszyklusentscheidung.",
        developer: "Die Anwendung verarbeitet die aufgelösten Submodel-Daten, validiert die erwartete semantische Version und erhält Asset-Identifier und Herkunft im Workflow.",
        whyNeeded: "Der Dataspace schafft erst Wert, wenn aus ausgetauschter Information eine operative Entscheidung wird.",
        withoutIt: "Die Organisation hat Konnektivität und Daten, fällt aber trotzdem auf manuelle Prüfung und getrennte Tabellen zurück.",
        actionLabel: "Circularity-Entscheidung treffen",
        payload: "MODULE-CE-778 → Material + Lebenszyklusdaten → Wiederverwenden / Reparieren / Recyceln"
      }
    },
    challenges: {
      "passport-not-found": {
        title: "Die physische Komponente existiert, aber digitale Informationen fehlen",
        prompt: "Der Operator scannt MODULE-CE-778, aber das System kann keinen Twin-Descriptor auflösen. Was sollte zuerst geprüft werden?",
        symptom: "Physisches Asset ✅  DTR-Suche ❌",
        hint: "Eine reale Komponente bedeutet nicht automatisch, dass ihr digitaler Descriptor unter dem verwendeten Identifier registriert ist.",
        rootCause: "Der Digital-Twin-Descriptor fehlt oder ist mit einem Identifier registriert, der nicht zum gescannten Asset-Identifier passt.",
        options: {
          "dtr": { "label": "DTR-Registrierung und Asset-Identifier prüfen", "explanation": "Richtig. Discovery braucht einen Descriptor unter dem erwarteten Identifier." },
          "policy": { "label": "Transfer-Policy neu schreiben", "explanation": "Policy wird nach der Discovery relevant; aktuell kann der Twin noch nicht gefunden werden." },
          "css": { "label": "Dashboard-Layout ändern", "explanation": "Eine visuelle Änderung kann keinen fehlenden Registry-Descriptor erzeugen." }
        }
      },
      "stale-circularity-model": {
        title: "Der Lebenszyklus-Payload kann nicht validiert werden",
        prompt: "Der geschützte Transfer funktioniert, aber der Consumer lehnt die Circularity-Datenstruktur ab. Was ist der beste nächste Check?",
        symptom: "Zugriff ✅  Transfer ✅  Schema-Validierung ❌",
        hint: "Transport und Autorisierung funktionieren. Konzentriere dich auf erwartete Datenbedeutung und Version.",
        rootCause: "Der Consumer erwartet eine andere Version des semantischen Modells als die, auf die das Submodel des Producers verweist.",
        options: {
          "semantic-version": { "label": "semanticId und Modellversion vergleichen", "explanation": "Richtig. Ein Versions-Mismatch erklärt, warum ein erfolgreich übertragener Payload nicht validiert werden kann." },
          "identity": { "label": "Neue Teilnehmeridentität ausstellen", "explanation": "Identität hat bereits funktioniert und erklärt keinen Fehler der Payload-Struktur." },
          "catalog": { "label": "Katalogangebot entfernen", "explanation": "Der Transfer war bereits erfolgreich; Discovery-Metadaten zu entfernen löst keine semantische Inkompatibilität." }
        }
      }
    }
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
