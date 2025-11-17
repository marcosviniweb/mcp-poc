export type ImportInfo = {
  name: string;
  from: string;
  isType?: boolean;
};

export type ComponentInfo = {
  name: string;
  file: string;
  selector?: string;
  standalone?: boolean;
  type?: 'component' | 'directive';
  inputs?: Array<{
    name: string;
    alias?: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
    kind?: 'decorator' | 'signal';
    resolvedType?: string;
  }>;
  outputs?: Array<{
    name: string;
    alias?: string;
    type?: string;
    description?: string;
    kind?: 'decorator' | 'signal';
    resolvedType?: string;
  }>;
  imports?: ImportInfo[];
};


