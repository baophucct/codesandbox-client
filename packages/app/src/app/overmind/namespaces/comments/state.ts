import { CommentsFilterOption } from '@codesandbox/common/lib/types';
import { CommentThreadFragment } from 'app/graphql/types';
import { Derive } from 'app/overmind';

type State = {
  commentThreads: {
    [sandboxId: string]: {
      [commentId: string]: CommentThreadFragment;
    };
  };
  currentCommentThreads: Derive<State, CommentThreadFragment[]>;
  selectedCommentsFilter: CommentsFilterOption;
  currentCommentThreadId: string | null;
  currentCommentThread: Derive<State, CommentThreadFragment | null>;
  fileComments: Derive<
    State,
    {
      [path: string]: Array<{
        commentThreadId: string;
        range: [number, number];
      }>;
    }
  >;
  creatingCommentThreadId: string | null;
};

export const state: State = {
  commentThreads: {},
  currentCommentThreadId: null,
  creatingCommentThreadId: null,
  fileComments: ({ currentCommentThreads }) =>
    currentCommentThreads.reduce<{
      [path: string]: Array<{
        commentThreadId: string;
        range: [number, number];
      }>;
    }>((aggr, commentThread) => {
      if (commentThread.reference && commentThread.reference.type === 'code') {
        if (!aggr[commentThread.reference.metadata.path]) {
          aggr[commentThread.reference.metadata.path] = [];
        }
        aggr[commentThread.reference.metadata.path].push({
          commentThreadId: commentThread.id,
          range: [
            commentThread.reference.metadata.anchor,
            commentThread.reference.metadata.head,
          ],
        });
      }

      return aggr;
    }, {}),
  currentCommentThread: (
    { commentThreads, currentCommentThreadId },
    { editor: { currentSandbox } }
  ) => {
    if (
      !currentSandbox ||
      !commentThreads[currentSandbox.id] ||
      !currentCommentThreadId
    ) {
      return null;
    }

    return commentThreads[currentSandbox.id][currentCommentThreadId];
  },
  selectedCommentsFilter: CommentsFilterOption.OPEN,
  currentCommentThreads: (
    { commentThreads, selectedCommentsFilter },
    { editor: { currentSandbox } }
  ) => {
    if (!currentSandbox || !commentThreads[currentSandbox.id]) {
      return [];
    }

    function sortByInsertedAt(
      commentThreadA: CommentThreadFragment,
      commentThreadB: CommentThreadFragment
    ) {
      const aDate = new Date(commentThreadA.insertedAt);
      const bDate = new Date(commentThreadB.insertedAt);

      if (aDate > bDate) {
        return -1;
      }

      if (bDate < aDate) {
        return 1;
      }

      return 0;
    }

    switch (selectedCommentsFilter) {
      case CommentsFilterOption.ALL:
        return Object.values(commentThreads[currentSandbox.id]).sort(
          sortByInsertedAt
        );
      case CommentsFilterOption.RESOLVED:
        return Object.values(commentThreads[currentSandbox.id])
          .filter(comment => comment.isResolved)
          .sort(sortByInsertedAt);
      case CommentsFilterOption.OPEN:
        return Object.values(commentThreads[currentSandbox.id])
          .filter(comment => !comment.isResolved)
          .sort(sortByInsertedAt);
      case CommentsFilterOption.MENTIONS:
        return Object.values(commentThreads[currentSandbox.id]).sort(
          sortByInsertedAt
        );
      default:
        return [];
    }
  },
};
