import 'react-markdown';

declare module 'react-markdown' {
  interface Components {
    math?: React.FC<{ children: React.ReactNode }>;
    inlineMath?: React.FC<{ children: React.ReactNode }>;
  }
}