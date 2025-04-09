import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Partial<Components> = {
 
  pre: ({ children }) => <>{children}</>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-2 leading-8" {...props}>
        {children}
      </li>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-decimal list-outside ml-6" {...props}>
        {children}
      </ul>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a: ({ node, children, ...props }) => {
    return (
      <a
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  p: ({ node, children, ...props }) => {
    return (
      <p className="text-md mt-3 leading-8" {...props}>
        {children}
      </p>
    );
  },
  // Table components
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  table: ({ node, children, ...props }) => {
    return (
      <div className="overflow-x-auto my-4">
        <table className="max-w-full divide-y divide-gray-300 border border-gray-300" {...props}>
          {children}
        </table>
      </div>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  thead: ({ node, children, ...props }) => {
    return (
      <thead className="bg-gray-50" {...props}>
        {children}
      </thead>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tbody: ({ node, children, ...props }) => {
    return (
      <tbody className="divide-y divide-gray-200 bg-white" {...props}>
        {children}
      </tbody>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tr: ({ node, children, ...props }) => {
    return (
      <tr className="hover:bg-gray-50" {...props}>
        {children}
      </tr>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  th: ({ node, children, ...props }) => {
    return (
      <th 
        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
        {...props}
      >
        {children}
      </th>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  td: ({ node, children, ...props }) => {
    return (
      <td 
        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
        {...props}
      >
        {children}
      </td>
    );
  }
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const MarkdownContent = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);