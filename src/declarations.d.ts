declare module 'react-native-html-to-pdf' {
  export interface Options {
    html: string;
    fileName?: string;
    base64?: boolean;
    directory?: string;
    width?: number;
    height?: number;
    padding?: number;
  }

  export interface PDFResult {
    filePath?: string;
    base64?: string;
  }

  export default class RNHTMLtoPDF {
    static convert(options: Options): Promise<PDFResult>;
  }


  export function generatePDF(options: Options): Promise<PDFResult>;
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}
