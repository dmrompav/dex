import type {
  GetScannerResultParams,
  IncomingWebSocketMessage,
} from "../api/types";

type WsEventHandler = (msg: IncomingWebSocketMessage) => void;

export class WsClient {
  private url: string;
  private socket: WebSocket | null = null;
  private handlers: Set<WsEventHandler> = new Set();
  private openHandlers: Set<() => void> = new Set();
  private closeHandlers: Set<(ev?: CloseEvent) => void> = new Set();
  private shouldReconnect = true;
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private subscribedPairs = new Set<string>();
  private subscribedPairStats = new Set<string>();
  // support multiple scanner-filter subscriptions (serialized JSON)
  private subscribedFilters = new Set<string>();

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.socket) return;
    this.shouldReconnect = true;
    this.doConnect();
  }

  private doConnect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener("open", () => {
      this.reconnectDelay = 1000;
      this.openHandlers.forEach((h) => h());
      // re-subscribe last filter if present
      // re-subscribe all active scanner filters
      for (const sf of this.subscribedFilters) {
        try {
          const parsed = JSON.parse(sf) as GetScannerResultParams;
          this.send({ event: "scanner-filter", data: parsed });
        } catch {
          // ignore invalid
        }
      }
      // resubscribe pairs and pair-stats
      for (const key of this.subscribedPairs) {
        const [pair, token, chain] = key.split("|");
        this.send({ event: "subscribe-pair", data: { pair, token, chain } });
      }
      for (const key of this.subscribedPairStats) {
        const [pair, token, chain] = key.split("|");
        this.send({
          event: "subscribe-pair-stats",
          data: { pair, token, chain },
        });
      }
    });

    this.socket.addEventListener("message", (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as IncomingWebSocketMessage;
        // debug incoming
        try {
          console.debug("WS IN:", parsed);
        } catch (e) {
          console.debug("ws debug in error", e);
        }
        this.handlers.forEach((h) => h(parsed));
      } catch (e) {
        // ignore invalid
        console.warn("ws invalid message", e);
      }
    });

    this.socket.addEventListener("close", (ev) => {
      this.socket = null;
      this.closeHandlers.forEach((h) => h(ev));
      if (this.shouldReconnect) {
        setTimeout(() => this.doConnect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      }
    });

    this.socket.addEventListener("error", (ev) => {
      // will trigger close soon
      console.warn("ws error", ev);
      try {
        this.socket?.close();
      } catch (e) {
        console.warn("ws close error", e);
      }
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.warn("ws send error", e);
      }
      this.socket = null;
    }
  }

  onMessage(h: WsEventHandler) {
    this.handlers.add(h);
  }

  offMessage(h: WsEventHandler) {
    this.handlers.delete(h);
  }

  onOpen(h: () => void) {
    this.openHandlers.add(h);
  }

  onClose(h: (ev?: CloseEvent) => void) {
    this.closeHandlers.add(h);
  }

  send(msg: unknown) {
    const raw = JSON.stringify(msg);
    try {
      // debug outgoing
      try {
        console.debug("WS OUT:", msg);
      } catch (e) {
        console.debug("ws debug out error", e);
      }
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(raw);
        return;
      }
      // attempt to send after a short delay if socket not ready
      setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket!.send(raw);
        }
      }, 500);
    } catch (e) {
      console.warn("ws send error", e);
    }
  }

  subscribeFilter(filter: GetScannerResultParams) {
    try {
      const key = JSON.stringify(filter);
      if (!this.subscribedFilters.has(key)) this.subscribedFilters.add(key);
      this.send({ event: "scanner-filter", data: filter });
    } catch {
      console.warn("subscribeFilter: could not serialize filter");
      this.send({ event: "scanner-filter", data: filter });
    }
  }

  unsubscribeFilter(filter: GetScannerResultParams) {
    try {
      const key = JSON.stringify(filter);
      this.subscribedFilters.delete(key);
    } catch {
      // ignore
    }
    this.send({ event: "unsubscribe-scanner-filter", data: filter });
  }

  subscribePair(pair: string, token: string, chain: string) {
    // validate args — ignore when caller accidentally passed an object
    if (
      typeof pair !== "string" ||
      typeof token !== "string" ||
      typeof chain !== "string"
    ) {
      console.warn("subscribePair: invalid args, expected strings", {
        pair,
        token,
        chain,
      });
      return;
    }
    const key = [pair, token, chain].join("|");
    if (this.subscribedPairs.has(key)) return;
    this.subscribedPairs.add(key);
    this.send({ event: "subscribe-pair", data: { pair, token, chain } });
  }

  unsubscribePair(pair: string, token: string, chain: string) {
    const key = [pair, token, chain].join("|");
    this.subscribedPairs.delete(key);
    this.send({ event: "unsubscribe-pair", data: { pair, token, chain } });
  }

  subscribePairStats(pair: string, token: string, chain: string) {
    if (
      typeof pair !== "string" ||
      typeof token !== "string" ||
      typeof chain !== "string"
    ) {
      console.warn("subscribePairStats: invalid args, expected strings", {
        pair,
        token,
        chain,
      });
      return;
    }
    const key = [pair, token, chain].join("|");
    if (this.subscribedPairStats.has(key)) return;
    this.subscribedPairStats.add(key);
    this.send({ event: "subscribe-pair-stats", data: { pair, token, chain } });
  }

  unsubscribePairStats(pair: string, token: string, chain: string) {
    const key = [pair, token, chain].join("|");
    this.subscribedPairStats.delete(key);
    this.send({
      event: "unsubscribe-pair-stats",
      data: { pair, token, chain },
    });
  }
}

export default WsClient;
