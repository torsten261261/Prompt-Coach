import React, { useState, useRef, useEffect } from 'react';
import { Message, AppState, ClarifyingQuestion, QnaHistoryItem } from './types';
import { getFirstQuestion, getNextStep, generateOptimizedPrompt, refinePrompt } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { UserInput } from './components/UserInput';
import { TypingIndicator } from './components/TypingIndicator';
import { QuestionInput } from './components/QuestionInput';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL_PROMPT);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<ClarifyingQuestion | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [qnaHistory, setQnaHistory] = useState<QnaHistoryItem[]>([]);

  const generatedPromptRef = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const addMessage = (text: string, sender: 'user' | 'bot', isPrompt: boolean = false) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text, isPrompt }]);
  };

  const resetApp = () => {
    setMessages([]);
    setAppState(AppState.INITIAL_PROMPT);
    setIsLoading(false);
    setCurrentQuestion(null);
    setInitialPrompt('');
    setQnaHistory([]);
    generatedPromptRef.current = '';
  };

  const handleInitialPrompt = async (userInput: string) => {
    addMessage(userInput, 'user');
    setInitialPrompt(userInput);
    setIsLoading(true);
    setAppState(AppState.ASKING_QUESTIONS);

    try {
      const firstQuestion = await getFirstQuestion(userInput);
      setCurrentQuestion(firstQuestion);
      addMessage(firstQuestion.question, 'bot');
    } catch (error) {
      console.error(error);
      addMessage('Entschuldigung, es gab ein Problem. Bitte versuche es erneut.', 'bot');
      setAppState(AppState.INITIAL_PROMPT);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConversationTurn = async (userInput: string) => {
    if (!currentQuestion) return;

    addMessage(userInput, 'user');
    setIsLoading(true);

    try {
        const nextStep = await getNextStep(messages, currentQuestion.question, userInput);
        const newHistoryItem: QnaHistoryItem = { question: currentQuestion.question, answer: userInput };

        switch (nextStep.type) {
            case 'explanation':
                if (typeof nextStep.text === 'string') {
                    addMessage(nextStep.text, 'bot');
                } else {
                    console.error("Received explanation without text.", nextStep);
                    addMessage('Entschuldigung, da ist etwas schiefgelaufen. Könntest du deine Frage wiederholen?', 'bot');
                }
                break;

            case 'next_question':
                setQnaHistory(prev => [...prev, newHistoryItem]);
                if (nextStep.question?.question && Array.isArray(nextStep.question.options)) {
                    setCurrentQuestion(nextStep.question);
                    addMessage(nextStep.question.question, 'bot');
                } else {
                    // Fallback: If the AI wants to ask a question but fails to provide a valid one,
                    // assume it has enough information and generate the prompt.
                    console.error("Received 'next_question' without a valid question object. Proceeding to generate prompt.", nextStep);
                    const finalHistory = [...qnaHistory, newHistoryItem];
                    setQnaHistory(finalHistory);
                    setCurrentQuestion(null);
                    setAppState(AppState.GENERATING_PROMPT);
                    addMessage('Vielen Dank! Ich habe anscheinend genügend Informationen. Ich erstelle jetzt einen optimierten Prompt-Vorschlag für dich...', 'bot');
                    
                    const prompt = await generateOptimizedPrompt(initialPrompt, finalHistory);
                    generatedPromptRef.current = prompt;
                    addMessage(prompt, 'bot', true);
                    addMessage('Sind alle wichtigen Details im Prompt enthalten? Bitte antworte mit "Ja" oder "Nein".', 'bot');
                    setAppState(AppState.FEEDBACK);
                }
                break;
            
            case 'generate_prompt':
                const finalHistory = [...qnaHistory, newHistoryItem];
                setQnaHistory(finalHistory);
                setCurrentQuestion(null);
                setAppState(AppState.GENERATING_PROMPT);
                addMessage('Vielen Dank! Ich erstelle jetzt einen optimierten Prompt-Vorschlag für dich...', 'bot');
                
                const prompt = await generateOptimizedPrompt(initialPrompt, finalHistory);
                generatedPromptRef.current = prompt;
                addMessage(prompt, 'bot', true);
                addMessage('Sind alle wichtigen Details im Prompt enthalten? Bitte antworte mit "Ja" oder "Nein".', 'bot');
                setAppState(AppState.FEEDBACK);
                break;
        }
    } catch (error) {
        console.error(error);
        addMessage('Entschuldigung, es ist ein Fehler aufgetreten. Lass es uns nochmal versuchen.', 'bot');
    } finally {
        setIsLoading(false);
    }
  };

  const handleFeedback = (userInput: string) => {
    addMessage(userInput, 'user');
    if (userInput.toLowerCase().trim().startsWith('ja')) {
      addMessage('Möchtest du den Prompt für den NeuroMedia24 Education Navigator 2.0 optimieren? Bitte antworte mit "Ja" oder "Nein".', 'bot');
      setAppState(AppState.AWAITING_NEURO_MEDIA_CHOICE);
    } else {
      addMessage('Verstanden. Was fehlt oder was soll ich verbessern?', 'bot');
      setAppState(AppState.REFINING);
    }
  };

  const handleNeuroMediaChoice = (userInput: string) => {
    addMessage(userInput, 'user');
    if (userInput.toLowerCase().trim().startsWith('ja')) {
        const neuroMediaText = "\n\nNenne mir alle relevanten Themen aus der NeuroMedia24 Mediathek inklusive Downloadlink an den jeweiligen Stellen deiner Antworten.";
        generatedPromptRef.current += neuroMediaText;
        addMessage('Verstanden. Der Prompt wurde für den NeuroMedia24 Education Navigator 2.0 angepasst:', 'bot');
        addMessage(generatedPromptRef.current, 'bot', true);
    }
    
    addMessage('Großartig! Viel Erfolg mit deinem optimierten Prompt.', 'bot');
    addMessage('Möchtest du einen weiteren Prompt optimieren? Bitte antworte mit "Ja" oder "Nein".', 'bot');
    setAppState(AppState.AWAITING_RESTART);
  };

  const handleRefinement = async (userInput: string) => {
    addMessage(userInput, 'user');
    setIsLoading(true);
    addMessage('Ich überarbeite den Prompt basierend auf deinem Feedback...', 'bot');
    
    try {
      const refined = await refinePrompt(generatedPromptRef.current, userInput);
      generatedPromptRef.current = refined;
      addMessage(refined, 'bot', true);
      addMessage('Ist der Prompt jetzt vollständig? Bitte antworte mit "Ja" oder "Nein".', 'bot');
      setAppState(AppState.FEEDBACK);
    } catch (error) {
      console.error(error);
      addMessage('Entschuldigung, es gab ein Problem bei der Überarbeitung. Lass es uns noch einmal versuchen. Was fehlt?', 'bot');
      setAppState(AppState.REFINING);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestartChoice = (userInput: string) => {
    addMessage(userInput, 'user');
    if (userInput.toLowerCase().trim().startsWith('ja')) {
        resetApp();
    } else {
        addMessage('Alles klar. Viel Erfolg!', 'bot');
        setAppState(AppState.DONE);
    }
  };

  const handleSubmit = (userInput: string) => {
    if (isLoading || appState === AppState.DONE || appState === AppState.ASKING_QUESTIONS) return;

    switch (appState) {
      case AppState.INITIAL_PROMPT:
        handleInitialPrompt(userInput);
        break;
      case AppState.FEEDBACK:
        handleFeedback(userInput);
        break;
      case AppState.REFINING:
        handleRefinement(userInput);
        break;
      case AppState.AWAITING_NEURO_MEDIA_CHOICE:
        handleNeuroMediaChoice(userInput);
        break;
      case AppState.AWAITING_RESTART:
        handleRestartChoice(userInput);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/70 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border border-slate-700 text-[16px]">
      <header className="p-4 text-center border-b border-slate-700 shrink-0">
        <h1 className="text-[32px] font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-sky-300 text-transparent bg-clip-text">
          Prompt-Coach
        </h1>
        <p className="text-white mt-2 text-[16px] max-w-xl mx-auto">
          Beschreibe hier deine Promptidee. Ich helfe dir, daraus einen optimalen Prompt zu entwickeln.
        </p>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={chatEndRef} />
      </main>
      <footer className="shrink-0">
        {appState === AppState.ASKING_QUESTIONS && currentQuestion ? (
          <QuestionInput
            key={currentQuestion.question} 
            question={currentQuestion}
            onSubmit={handleConversationTurn}
            disabled={isLoading}
          />
        ) : (
          <div className="p-4 border-t border-slate-700">
            <UserInput
              onSubmit={handleSubmit}
              disabled={isLoading || appState === AppState.DONE}
              appState={appState}
            />
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;