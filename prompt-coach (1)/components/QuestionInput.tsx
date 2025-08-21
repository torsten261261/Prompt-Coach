import React, { useState, useEffect } from 'react';
import { ClarifyingQuestion } from '../types';

interface QuestionInputProps {
  question: ClarifyingQuestion;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({ question, onSubmit, disabled }) => {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [otherValue, setOtherValue] = useState('');

  useEffect(() => {
    setSelectedOptions(new Set());
    setOtherValue('');
  }, [question]);

  const handleCheckboxChange = (option: string) => {
    const newSelection = new Set(selectedOptions);
    if (newSelection.has(option)) {
      newSelection.delete(option);
    } else {
      newSelection.add(option);
    }
    setSelectedOptions(newSelection);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedAnswer = [...Array.from(selectedOptions), otherValue].filter(Boolean).join(', ');
    if (combinedAnswer.trim() && !disabled) {
      onSubmit(combinedAnswer.trim());
    }
  };

  const isSubmitDisabled = disabled || (selectedOptions.size === 0 && otherValue.trim() === '');

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700 bg-slate-800/50">
      <div className="flex flex-wrap gap-2 mb-4">
        {question.options.map((option, index) => (
          <label key={index} className={`flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded-full border text-sm transition-colors duration-200 ${selectedOptions.has(option) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'}`}>
            <input
              type="checkbox"
              checked={selectedOptions.has(option)}
              onChange={() => handleCheckboxChange(option)}
              className="hidden"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          placeholder="Andere..."
          disabled={disabled}
          className="flex-1 p-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold p-3 rounded-lg transition-colors duration-200 flex items-center justify-center h-[50px] w-[50px]"
          aria-label="Antwort senden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </form>
  );
};
