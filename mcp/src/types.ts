export type ComponentInfo = {
  name: string;
  file: string;
  selector?: string;
  standalone?: boolean;
  inputs?: Array<{
    name: string;
    alias?: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  outputs?: Array<{
    name: string;
    alias?: string;
    type?: string;
    description?: string;
  }>;
};


