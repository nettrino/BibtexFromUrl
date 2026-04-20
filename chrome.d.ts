// Minimal Chrome extension API stubs for ts-check — covers APIs used in this project

declare namespace chrome {
  namespace storage {
    interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }
    interface StorageArea {
      get(key: string): Promise<Record<string, any>>;
      get(key: string, callback: (data: Record<string, any>) => void): void;
      set(items: Record<string, any>): Promise<void>;
      set(items: Record<string, any>, callback?: () => void): void;
    }
    const sync: StorageArea;
    const onChanged: {
      addListener(callback: (changes: Record<string, StorageChange>, area: string) => void): void;
    };
  }

  namespace runtime {
    interface MessageSender {
      tab?: { id?: number };
    }
    function sendMessage(message: any): void;
    function getContexts(filter: { contextTypes: string[] }): Promise<any[]>;
    const onMessage: {
      addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => void): void;
    };
    const onInstalled: {
      addListener(callback: () => void): void;
    };
  }

  namespace action {
    function setIcon(details: { path: Record<number, string> }, callback?: () => void): void;
    const onClicked: {
      addListener(callback: (tab: { id?: number }) => void): void;
    };
  }

  namespace scripting {
    function executeScript(injection: { target: { tabId: number }; files: string[] }): Promise<any>;
  }

  namespace offscreen {
    function createDocument(params: { url: string; reasons: string[]; justification: string }): Promise<void>;
    const Reason: { CLIPBOARD: string };
  }
}

// Chrome built-in AI (LanguageModel API — Chrome 138+)
declare class LanguageModel {
  static availability(): Promise<"available" | "downloadable" | "unavailable">;
  static create(options?: { responseConstraint?: Record<string, unknown> }): Promise<LanguageModelSession>;
}

interface LanguageModelSession {
  prompt(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
