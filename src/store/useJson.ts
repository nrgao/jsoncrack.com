import { create } from "zustand";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import useFile from "./useFile";

interface JsonActions {
  setJson: (json: string) => void;
  getJson: () => string;
  clear: () => void;
}

const initialStates = {
  json: "{}",
  loading: true,
};

export type JsonStates = typeof initialStates;

const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,
  getJson: () => get().json,
  setJson: json => {
    set({ json, loading: false });
    // Also update the text editor contents so the left panel reflects changes
    try {
      // update editor contents in a way that triggers the editor value update
      // prefer using setContents to keep internal invariants, fall back to setState
      const setContents = useFile.getState().setContents;
      if (setContents) {
        // use skipUpdate to avoid triggering live transform loops
        setContents({ contents: json, hasChanges: false, skipUpdate: true });
      } else {
        useFile.setState({ contents: json, hasChanges: false });
      }
    } catch (e) {
      // if updating file state fails, continue to update graph
    }
    useGraph.getState().setGraph(json);
  },
  clear: () => {
    set({ json: "", loading: false });
    useGraph.getState().clearGraph();
  },
}));

export default useJson;
