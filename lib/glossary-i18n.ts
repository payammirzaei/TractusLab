import type { Locale } from "@/lib/i18n";
import { glossary } from "@/data/glossary";

const de: Partial<Record<keyof typeof glossary, string>> = {
  Dataspace: "Ein vertrauenswürdiger und geregelter Raum für Datenaustausch zwischen unabhängigen Organisationen, bei dem jede Seite die Kontrolle über ihre eigenen Daten behält.",
  Identity: "Die überprüfbare Identität eines Teilnehmers, mit der klar wird, welches Unternehmen auf der anderen Seite des Austauschs handelt.",
  EDC: "Ein Connector für geregelten Datenaustausch, der Angebote, Policies, Verhandlungen und Transfers zwischen Provider und Consumer unterstützt.",
  Catalog: "Eine Liste auffindbarer Datenangebote und ihrer Metadaten. Der Katalog zeigt, was angeboten wird, ohne die geschützten Daten selbst zu übertragen.",
  Provider: "Der Teilnehmer, der ein Datenangebot bereitstellt und die Bedingungen für den Zugriff festlegt.",
  Consumer: "Der Teilnehmer, der ein Datenangebot findet, Bedingungen akzeptiert und die erlaubten Daten nutzt.",
  "Semantic Model": "Ein gemeinsames maschinenlesbares Modell, das Struktur und Bedeutung von Daten über verschiedene Systeme hinweg festlegt.",
  Interoperability: "Die Fähigkeit unterschiedlicher Systeme, Daten nicht nur zu übertragen, sondern auch konsistent zu verstehen und zu verarbeiten.",
  Policy: "Maschinenlesbare Regeln, die festlegen, wer Daten unter welchen Bedingungen nutzen darf.",
  "Data Sovereignty": "Die Fähigkeit des Dateneigentümers, Kontrolle über Zugriff und Nutzung seiner Daten zu behalten.",
  "Contract Negotiation": "Der Ablauf, in dem Provider und Consumer die Bedingungen eines konkreten Datenangebots zu einer Vereinbarung machen.",
  Agreement: "Die akzeptierte Vereinbarung, die ein konkretes Datenangebot mit den vereinbarten Nutzungsbedingungen verbindet.",
  "Data Transfer": "Der kontrollierte Prozess, mit dem Daten nach einer Vereinbarung tatsächlich geliefert oder zugänglich gemacht werden.",
  "Data Plane": "Der technische Pfad, über den die eigentlichen Daten während eines Transfers bewegt oder bereitgestellt werden.",
  "Digital Twin": "Eine digitale Repräsentation eines realen Assets, die strukturierte Informationen und standardisierte Aspekte dieses Assets zugänglich macht.",
  Asset: "Ein eindeutig identifizierbares reales oder digitales Objekt, auf das sich Daten, Beziehungen und Geschäftsprozesse beziehen.",
  DTR: "Die Digital Twin Registry hilft dabei, digitale Repräsentationen von Assets über gemeinsame Identifier und Descriptoren zu finden.",
  Descriptor: "Metadaten, die beschreiben, wie ein Digital Twin oder ein Submodel identifiziert und erreicht werden kann.",
  Submodel: "Ein abgegrenzter Aspekt eines Digital Twins, zum Beispiel Materialdaten, Qualitätsinformationen oder Lebenszyklusinformationen.",
  semanticId: "Ein Identifier, der festlegt, welchem semantischen Modell oder welcher fachlichen Bedeutung ein Datenaspekt folgt.",
  Traceability: "Die Fähigkeit, Teile, Batches und ihre Beziehungen durch die Lieferkette zu verfolgen und Ereignisse mit betroffenen Assets zu verbinden.",
  "Demand & Capacity": "Ein Planungs-Use-Case, der Kundenbedarf mit realistischer Lieferantenkapazität für ein Teil und einen Zeitraum vergleicht.",
  "Quality Result": "Ein strukturierter Qualitätsbefund, der an ein Asset, eine Beobachtung und Evidenz gebunden ist, damit Partner dasselbe Ergebnis verstehen.",
  Circularity: "Die Nutzung vertrauenswürdiger Produkt- und Lebenszyklusinformationen für Entscheidungen zu Wiederverwendung, Reparatur, Aufarbeitung und Recycling.",
  "Product Passport": "Eine auffindbare digitale Sammlung von Produktinformationen, die ein Asset mit relevanten Material-, Lebenszyklus- und Compliance-Daten verbindet.",
};

export function glossaryDefinition(term: keyof typeof glossary, locale: Locale): string {
  return locale === "de" ? de[term] ?? glossary[term] : glossary[term];
}
