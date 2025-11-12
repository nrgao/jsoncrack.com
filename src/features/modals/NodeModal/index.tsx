import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  Textarea,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setJson = useJson(state => state.setJson);
  const getJson = useJson(state => state.getJson);

  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEditing(false);
    setError(null);
    setValue(normalizeNodeData(nodeData?.text ?? []));
  }, [nodeData, opened]);

  const saveChanges = () => {
    setError(null);
    const originalJsonStr = getJson();
    let root: any;
    try {
      root = JSON.parse(originalJsonStr);
    } catch (e) {
      setError("Current JSON is invalid. Cannot apply changes.");
      return;
    }

    // prepare new value: try parse as JSON, fallback to string
    let newValue: any;
    try {
      newValue = JSON.parse(value);
    } catch (e) {
      // treat as string
      newValue = value;
    }

    const path = nodeData?.path ?? [];

    try {
      if (!path || path.length === 0) {
        // replace root
        root = newValue;
      } else {
        let cursor: any = root;
        for (let i = 0; i < path.length - 1; i++) {
          const seg = path[i] as any;
          if (cursor[seg] === undefined) cursor[seg] = typeof path[i + 1] === "number" ? [] : {};
          cursor = cursor[seg];
        }
        const last = path[path.length - 1] as any;

        const existing = cursor[last];

        // If both existing and newValue are plain objects, merge shallowly so we don't wipe unrelated keys
        const isPlainObject = (v: any) => v && typeof v === "object" && !Array.isArray(v);

        if (isPlainObject(existing) && isPlainObject(newValue)) {
          // merge properties from newValue into existing object
          cursor[last] = { ...existing, ...newValue };
        } else {
          // default: replace
          cursor[last] = newValue;
        }
      }

      const updated = JSON.stringify(root, null, 2);
      setJson(updated);
      setEditing(false);
      onClose?.();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Group>
              {editing ? (
                <>
                  <Button size="xs" onClick={saveChanges} data-testid="node-save">
                    Save
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => {
                      // cancel editing and reset buffer to original node content
                      setEditing(false);
                      setError(null);
                      setValue(normalizeNodeData(nodeData?.text ?? []));
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="xs"
                  onClick={() => {
                    // ensure editor shows the current node content when entering edit mode
                    setValue(normalizeNodeData(nodeData?.text ?? []));
                    setEditing(true);
                  }}
                  data-testid="node-edit"
                >
                  Edit
                </Button>
              )}
              <CloseButton onClick={onClose} />
            </Group>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {editing ? (
              <div style={{ maxWidth: 600 }}>
                <Textarea
                  minRows={3}
                  value={value}
                  onChange={e => setValue(e.currentTarget.value)}
                />
              </div>
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
            {error && (
              <Text color="red" fz="xs">
                {error}
              </Text>
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
