async function checkAIAvailability() {
  try {
    if (typeof LanguageModel === "undefined") return false;
    const availability = await LanguageModel.availability();
    return availability === "available";
  } catch (e) {
    console.error("AI availability check failed:", e);
    return false;
  }
}

async function extractWithAI(pageText, heuristicMeta) {
  let session = null;
  try {
    const schema = {
      type: "object",
      properties: {
        author: {
          type: "string",
          description: "Author name(s), comma-separated if multiple",
        },
        date: {
          type: "string",
          description: "Publication date in ISO 8601 format (YYYY-MM-DD)",
        },
        publicationType: {
          type: "string",
          enum: [
            "article",
            "blogpost",
            "report",
            "documentation",
            "news",
            "book",
            "other",
          ],
        },
        abstract: {
          type: "string",
          description: "1-2 sentence summary of the page content",
        },
        citationKey: {
          type: "string",
          description:
            "Citation key: first author surname + year, e.g. smith2024",
        },
      },
      required: [],
    };

    const existingFields = [];
    if (heuristicMeta.author) existingFields.push(`author: ${heuristicMeta.author}`);
    if (heuristicMeta.date) existingFields.push(`date: ${heuristicMeta.date}`);
    if (heuristicMeta.title) existingFields.push(`title: ${heuristicMeta.title}`);

    const existingInfo =
      existingFields.length > 0
        ? `Already extracted: ${existingFields.join(", ")}. Only fill in MISSING fields.`
        : "No metadata found yet. Extract all fields you can.";

    const prompt = `Extract bibliographic metadata from this webpage text. ${existingInfo}

Page text:
${pageText}

Return JSON with any of: author, date (ISO 8601), publicationType (article|blogpost|report|documentation|news|book|other), abstract (1-2 sentences), citationKey (surname+year).
Only include fields you are confident about. Omit fields already extracted above.`;

    session = await LanguageModel.create({
      responseConstraint: schema,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await session.prompt(prompt, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return JSON.parse(response);
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  } catch (e) {
    console.error("AI extraction failed:", e);
    return null;
  } finally {
    if (session) {
      try { session.destroy(); } catch (_) {}
    }
  }
}
