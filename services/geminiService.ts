
import { GoogleGenAI, Type, Part } from '@google/genai';
import { QuizConfig, Question, ChatMessage, UserAnswer, UserConfidence, Flashcard, ChatMode, SourceMaterial } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const MAX_CONTEXT_CHARS = 500000;

// Updated schema to include a top-level title
const quizSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short, creative, and relevant title for this quiz based on the content." },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "The type of question. Must be one of: 'MCQ', 'True/False', or 'Fill-in-the-Blank'." },
          question: { type: Type.STRING, description: 'The quiz question. For "Fill-in-the-Blank", it must contain a placeholder like "____".' },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'An array of possible answers. Required for "MCQ" (4 options) and "True/False" (2 options: "True", "False"). Must be omitted for "Fill-in-the-Blank".'
          },
          correctAnswer: { type: Type.STRING, description: 'The correct answer. For MCQ and True/False, it must be an exact match to one of the options. For Fill-in-the-Blank, it is the word(s) that fills the blank.' },
          explanation: { type: Type.STRING, description: 'A brief explanation for the correct answer.' },
          category: { type: Type.STRING, description: 'A one or two-word category for the question based on the context.' }
        },
        required: ['type', 'question', 'correctAnswer', 'explanation', 'category'],
      }
    }
  },
  required: ['title', 'questions']
};

const flashcardSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: { type: Type.STRING, description: "The front of the flashcard (a question, term, or concept)." },
      back: { type: Type.STRING, description: "The back of the flashcard (the answer or explanation)." },
    },
    required: ['front', 'back'],
  },
};

/**
 * Splits a large text string into overlapping chunks.
 */
const splitTextIntoChunks = (text: string, maxChars: number = 30000, overlap: number = 1000): string[] => {
  if (text.length <= maxChars) return [text];
  
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    if (text.length - startIndex <= maxChars) {
      chunks.push(text.substring(startIndex));
      break;
    }

    let splitIndex = startIndex + maxChars;
    const lastParagraph = text.lastIndexOf('\n\n', splitIndex);
    if (lastParagraph > startIndex + (maxChars * 0.7)) {
        splitIndex = lastParagraph;
    } else {
        const lastSentence = text.lastIndexOf('. ', splitIndex);
        if (lastSentence > startIndex + (maxChars * 0.7)) {
            splitIndex = lastSentence + 1;
        }
    }
    
    chunks.push(text.substring(startIndex, splitIndex));
    startIndex = splitIndex - overlap;
  }
  return chunks;
};

/**
 * Helper to construct Parts from SourceMaterials
 */
const getPartsFromMaterials = (materials: SourceMaterial[]): { imageParts: Part[], textContent: string } => {
  const imageParts: Part[] = materials
    .filter(m => m.type === 'image')
    .map(m => ({
      inlineData: {
        mimeType: m.mimeType!,
        data: m.content
      }
    }));

  const textContent = materials
    .filter(m => m.type === 'text')
    .map(m => m.content)
    .join('\n\n--- (Next Document) ---\n\n');

  return { imageParts, textContent };
};

interface QuizResponse {
  title: string;
  questions: Question[];
}

export const generateQuiz = async (materials: SourceMaterial[], config: QuizConfig): Promise<QuizResponse> => {
  const varietyInstructions = config.questionVariety === 'Varied'
    ? `
    4. Generate a mix of question types: Multiple Choice ('MCQ'), 'True/False', and 'Fill-in-the-Blank'.
    5. For 'MCQ' questions: provide an 'options' array with exactly 4 strings. The 'type' must be 'MCQ'.
    6. For 'True/False' questions: provide an 'options' array with two strings: "True" and "False". The 'type' must be 'True/False'.
    7. For 'Fill-in-the-Blank' questions: the question text must contain a placeholder like "____". Omit the 'options' array entirely for this type. The 'type' must be 'Fill-in-the-Blank'.
    8. For all types, ensure the 'correctAnswer' is accurate. For MCQ and True/False, it must be one of the options.
    `
    : `
    4. Each question must be a multiple-choice question (MCQ) with a 'type' of 'MCQ'.
    5. Each question must have exactly 4 options in the 'options' array.
    6. Ensure the 'correctAnswer' value is an exact match to one of the strings in the 'options' array.
    `;

  const { imageParts, textContent } = getPartsFromMaterials(materials);
  
  // Phase 1: Chunking (only applies to text)
  const chunks = textContent ? splitTextIntoChunks(textContent) : [''];
  const totalQuestions = config.numQuestions;
  
  try {
    let allQuestions: Question[] = [];
    let title = "Quiz";

    // Phase 2: Map & Execute
    if (chunks.length === 1) {
       const prompt = `
        Based on the provided context (text and/or images), generate a quiz.

        Context Text: """
        ${chunks[0]}
        """

        Instructions:
        1. Generate exactly ${totalQuestions} questions.
        2. The complexity of the questions should be: ${config.complexity}.
        3. The tone of the questions and explanations should be: ${config.tone}.
        ${varietyInstructions}
        9. Provide a concise 'explanation' for why the correct answer is right.
        10. Assign a relevant 'category' to each question based on the context.
        11. Generate a short, descriptive 'title' for this quiz.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          role: 'user',
          parts: [...imageParts, { text: prompt }]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: quizSchema,
          temperature: 0.7,
        },
      });
      
      const parsed = JSON.parse(response.text.trim()) as QuizResponse;
      allQuestions = parsed.questions;
      title = parsed.title;

    } else {
      // Map-Reduce across chunks
      const questionsPerChunk = Math.floor(totalQuestions / chunks.length);
      let remainder = totalQuestions % chunks.length;

      const chunkPromises = chunks.map(async (chunk, i) => {
          let count = questionsPerChunk;
          if (i < remainder) count++;
          
          if (count === 0) return null;

           const prompt = `
            Based on the following context (Part ${i + 1} of ${chunks.length} of the document) and provided images, generate a quiz.
            
            Context Text: """
            ${chunk}
            """
            
            Instructions:
            1. Generate exactly ${count} questions.
            2. The complexity of the questions should be: ${config.complexity}.
            3. The tone of the questions and explanations should be: ${config.tone}.
            ${varietyInstructions}
            9. Provide a concise 'explanation' for why the correct answer is right.
            10. Assign a relevant 'category' to each question based on the context.
            11. Generate a short, descriptive 'title' for this quiz section.
           `;
           
           try {
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                  role: 'user',
                  parts: [...imageParts, { text: prompt }]
                },
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: quizSchema,
                  temperature: 0.7,
                },
              });
              return JSON.parse(response.text.trim()) as QuizResponse;
           } catch (e) {
             console.error(`Error processing chunk ${i}:`, e);
             return null;
           }
      });

      const results = await Promise.all(chunkPromises);
      const validResults = results.filter(r => r !== null) as QuizResponse[];
      
      allQuestions = validResults.flatMap(r => r.questions);
      // Use the title from the first chunk as the main title
      if (validResults.length > 0) {
        title = validResults[0].title;
      }
    }
    
    if (allQuestions.length === 0) {
       throw new Error("AI returned an invalid response format or empty quiz.");
    }
    
    return { title, questions: allQuestions };

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

export const generatePerformanceSummary = async (
  quizData: Question[],
  userAnswers: UserAnswer,
  userConfidence: UserConfidence,
  config: QuizConfig
): Promise<string> => {
  try {
    const performanceData = quizData.map((q, index) => {
      const userAnswer = userAnswers[index];
      let isCorrect = false;
      if (q.type === 'Fill-in-the-Blank') {
        isCorrect = userAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      } else {
        isCorrect = userAnswer === q.correctAnswer;
      }
      return {
        question: q.question,
        category: q.category,
        isCorrect,
        confidence: userConfidence[index] || 'Unrated',
      };
    });

    const prompt = `
      Analyze the following student quiz results. Provide a brief, encouraging summary of their performance, identify the top 2-3 priority areas for improvement based on categories with incorrect answers, and suggest a specific, actionable study tip for each area. Pay special attention to questions that were answered incorrectly with high confidence ("Confident"), as these indicate significant knowledge gaps.

      Quiz Configuration:
      - Complexity: ${config.complexity}
      - Total Questions: ${quizData.length}

      Performance Data:
      ${JSON.stringify(performanceData, null, 2).substring(0, 30000)}

      Your analysis MUST be formatted in Markdown and have three sections with these exact headings:
      ### Overall Performance
      (A short, encouraging one-paragraph summary.)

      ### Key Areas for Improvement
      (A bulleted list of the top 2-3 categories to focus on. If performance is good, say so.)

      ### Actionable Study Tips
      (A bulleted list of concrete tips, one for each improvement area.)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating performance summary:", error);
    throw new Error("An error occurred while generating your performance summary.");
  }
};

export const generateFlashcards = async (incorrectQuestions: Question[], materials: SourceMaterial[]): Promise<Flashcard[]> => {
  if (incorrectQuestions.length === 0) return [];
  
  const { imageParts, textContent } = getPartsFromMaterials(materials);
  const prompt = `
    Based on the original context provided (images and text) and the list of questions the user answered incorrectly, generate flashcards to help them study.

    Original Context Text:
    """
    ${textContent.substring(0, MAX_CONTEXT_CHARS)}
    """

    Incorrectly Answered Questions:
    ${JSON.stringify(incorrectQuestions.map(q => ({question: q.question, correctAnswer: q.correctAnswer, category: q.category})), null, 2)}

    Instructions:
    - Generate exactly ${incorrectQuestions.length} flashcards.
    - Create exactly one flashcard corresponding to each incorrect question provided above.
    - The "front" should be the question concept or term related to the error.
    - The "back" should be the answer or a clear, brief explanation.
    - Ensure the flashcards directly address the knowledge gaps revealed by the incorrect answers.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
          role: 'user',
          parts: [...imageParts, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: flashcardSchema,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as Flashcard[];
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error("There was an error generating the flashcards.");
  }
};


export const generateHint = async (materials: SourceMaterial[], question: Question): Promise<string> => {
  const { imageParts, textContent } = getPartsFromMaterials(materials);
  const prompt = `
    Based on the provided context, generate a short, one-sentence, subtle hint for the following quiz question. 
    The hint should not give away the answer, but rather guide the user towards the correct concept or piece of information.

    Context Text:
    """
    ${textContent.substring(0, MAX_CONTEXT_CHARS)}
    """

    Question: "${question.question}"

    Hint:
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [...imageParts, { text: prompt }]
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating hint:", error);
    return "Sorry, I couldn't generate a hint right now.";
  }
};


export async function* getChatResponse(
  question: Question,
  userAnswer: string | undefined,
  chatHistory: ChatMessage[],
  materials: SourceMaterial[],
  mode: ChatMode = 'standard'
): AsyncGenerator<string> {
  const { imageParts, textContent } = getPartsFromMaterials(materials);
  
  const socraticInstruction = `You are an AI tutor using the Socratic method. Your goal is to guide the user to discover the answer themselves, not to provide it directly.
- Ask probing questions that challenge their assumptions.
- Help them identify their own misconceptions.
- If they are completely stuck, provide a small hint that leads them in the right direction.
- Do not give away the direct answer or the full explanation unless they have demonstrated understanding and you are summarizing.
- Keep your responses conversational and encouraging.`;

  const directInstruction = `You are an AI tutor. Your goal is to be helpful, encouraging, and provide clear, step-by-step explanations.
- Directly address the user's question.
- Use the provided context to explain why the correct answer is right and why other options might be wrong.
- Be supportive and clear in your explanations.`;

  const eli5Instruction = `You are an AI tutor explaining complex concepts to a 5-year-old (ELI5).
- Use very simple language and short, clear sentences.
- Avoid all technical jargon.
- Use fun, relatable analogies (like toys, animals, games, or simple daily activities) to explain the concept.
- Be enthusiastic, friendly, and patient.
- Do not be condescending, just simple and clear.`;

  let systemInstruction = directInstruction;
  if (mode === 'socratic') systemInstruction = socraticInstruction;
  else if (mode === 'eli5') systemInstruction = eli5Instruction;
  
  const prompt = `
    ${systemInstruction}

    Original Context Text: """
    ${textContent.substring(0, MAX_CONTEXT_CHARS)}
    """

    Quiz Question: "${question.question}"
    Options: ${question.options?.join(', ')}
    Correct Answer: "${question.correctAnswer}"
    User's Answer: ${userAnswer ? `"${userAnswer}"` : "Not answered"}
    
    Conversation History:
    ${chatHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}

    Your Task:
    - Respond to the user's latest message: "${chatHistory[chatHistory.length - 1].text}".
    - Use Markdown for formatting (e.g., lists, bold, italics, code blocks) to improve readability.
    - Keep your responses concise.
    - The user may be asking about the images provided. Refer to them if relevant.
    - After your main response, add 2-3 short, relevant follow-up questions on new lines, each prefixed with "[SUGGESTION]". For example:
    [SUGGESTION] Can you explain that differently?
    [SUGGESTION] What's another example?
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [...imageParts, { text: prompt }]
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error getting chat response:", error);
    yield "I'm sorry, I'm having trouble responding right now. Please try again later.";
  }
};
