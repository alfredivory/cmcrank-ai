'use client';

interface ChatMessageProps {
  role: 'USER' | 'ASSISTANT';
  content: string;
  suggestsReresearch?: boolean;
  onReresearchClick?: () => void;
}

function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-sm">$1</code>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br>');
}

export default function ChatMessage({
  role,
  content,
  suggestsReresearch,
  onReresearchClick,
}: ChatMessageProps) {
  const isUser = role === 'USER';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-200 rounded-bl-none'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(content) }}
          />
        )}
        {suggestsReresearch && onReresearchClick && (
          <button
            onClick={onReresearchClick}
            className="mt-2 w-full text-xs bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 rounded-lg px-3 py-1.5 transition-colors"
          >
            The AI suggests a re-research might be useful. Trigger re-research?
          </button>
        )}
      </div>
    </div>
  );
}
