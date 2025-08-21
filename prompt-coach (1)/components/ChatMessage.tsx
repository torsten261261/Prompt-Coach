import React, { useState } from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copyText, setCopyText] = useState('Kopieren');
  
  const isBot = message.sender === 'bot';
  const isPromptMessage = isBot && message.isPrompt;

  const wrapperClasses = `flex ${isBot ? 'justify-start' : 'justify-end'}`;
  const messageClasses = `relative max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl ${
    isBot
      ? 'bg-slate-700 text-white rounded-bl-none'
      : 'bg-blue-600 text-white rounded-br-none'
  }`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopyText('Kopiert!');
      setTimeout(() => setCopyText('Kopieren'), 2000);
    }, (err) => {
      console.error('Konnte Text nicht kopieren: ', err);
    });
  };

  return (
    <div className={wrapperClasses}>
      <div className={messageClasses}>
        {isPromptMessage && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-600/80 text-white text-xs font-semibold py-1 px-2.5 rounded-full transition-colors duration-200"
            aria-label="Prompt kopieren"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copyText}</span>
          </button>
        )}
        <div className="whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    </div>
  );
};
