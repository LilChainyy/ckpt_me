"use client";

import { useMemo } from "react";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import "react-diff-view/style/index.css";
import { makeDiff, makeAddedDiff, makeUnchangedDiff } from "../lib/make-diff";

interface CodeDiffProps {
  /** Content of this file in the previous step. Undefined = new file. */
  oldCode: string | undefined;
  /** Content of this file at the current step. */
  newCode: string;
}

export default function CodeDiff({ oldCode, newCode }: CodeDiffProps) {
  const files = useMemo(() => {
    let diffText: string;
    if (oldCode == null) {
      // New file — all lines green
      diffText = makeAddedDiff(newCode, "snapshot");
    } else if (oldCode === newCode) {
      // Unchanged file — show full content with neutral lines
      diffText = makeUnchangedDiff(newCode, "snapshot");
    } else {
      diffText = makeDiff(oldCode, newCode, "snapshot");
    }
    return parseDiff(diffText);
  }, [oldCode, newCode]);

  if (files.length === 0) {
    return <div className="diff-empty"><span>no changes</span></div>;
  }

  return (
    <div className="diff-wrap">
      {files.map((file, i) => (
        <Diff
          key={i}
          viewType="split"
          diffType={file.type}
          hunks={file.hunks}
        >
          {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
        </Diff>
      ))}
    </div>
  );
}
