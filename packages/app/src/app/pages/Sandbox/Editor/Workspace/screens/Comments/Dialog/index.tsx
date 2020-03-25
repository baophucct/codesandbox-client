import { ENTER } from '@codesandbox/common/lib/utils/keycodes';
import {
  Element,
  IconButton,
  Menu,
  Stack,
  Avatar,
  Text,
  Textarea,
} from '@codesandbox/components';
import css from '@styled-system/css';
import { useOvermind } from 'app/overmind';
import { OPTIMISTIC_COMMENT_ID } from 'app/overmind/namespaces/comments/state';
import { motion } from 'framer-motion';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { AvatarBlock } from '../components/AvatarBlock';
import { EditComment } from '../components/EditComment';
import { Markdown } from './Markdown';
import { Reply } from './Reply';
import { useScrollTop } from './use-scroll-top';

export const CommentDialog = props =>
  ReactDOM.createPortal(<Dialog {...props} />, document.body);

export const Dialog: React.FC = () => {
  const { state, actions } = useOvermind();
  const comment = state.comments.currentComment;
  const currentCommentPositions = state.comments.currentCommentPositions;
  const isNewComment = comment.id === OPTIMISTIC_COMMENT_ID;
  const [editing, setEditing] = useState(isNewComment);
  const { ref: listRef, scrollTop } = useScrollTop();

  const closeDialog = () => actions.comments.closeComment();

  // reset editing when comment changes
  React.useEffect(() => {
    setEditing(isNewComment);
  }, [comment.id, isNewComment]);

  if (!currentCommentPositions) {
    return null;
  }

  const isCodeComment =
    comment.references[0] && comment.references[0].type === 'code';

  const { animateFrom, dialogPosition } = getPositions(
    currentCommentPositions,
    isCodeComment
  );

  return (
    <motion.div
      key={isCodeComment ? 'code' : 'global'}
      initial={{ ...animateFrom, scale: 0.5, opacity: 0 }}
      animate={{ ...dialogPosition, scale: 1, opacity: 1 }}
      drag
      dragMomentum={false}
      transition={{ duration: 0.25 }}
      style={{ position: 'absolute', zIndex: 2 }}
    >
      <Stack
        direction="vertical"
        css={css({
          position: 'absolute',
          zIndex: 2,
          backgroundColor: 'dialog.background',
          color: 'dialog.foreground',
          border: '1px solid',
          borderColor: 'dialog.border',
          borderRadius: 4,
          width: 420,
          height: 'auto',
          maxHeight: '80vh',
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden',
          boxShadow: 2,
        })}
      >
        {isNewComment && editing ? (
          <AddComment
            comment={comment}
            onSave={() => setEditing(false)}
            onCancel={closeDialog}
          />
        ) : (
          <>
            <Stack
              align="center"
              justify="space-between"
              padding={4}
              paddingRight={2}
              marginBottom={2}
              css={css({
                cursor: 'move',
                zIndex: 2,
                boxShadow: theme =>
                  scrollTop > 0
                    ? `0px 32px 32px ${theme.colors.dialog.background}`
                    : 'none',
              })}
            >
              <Text size={3} weight="bold">
                Comment
              </Text>
              <Stack align="center">
                <IconButton
                  onClick={() =>
                    actions.comments.resolveComment({
                      commentId: comment.id,
                      isResolved: !comment.isResolved,
                    })
                  }
                  name="check"
                  size={14}
                  title="Resolve Comment"
                  css={css({
                    transition: 'color',
                    transitionDuration: theme => theme.speeds[1],
                    color: comment.isResolved ? 'green' : 'mutedForeground',
                  })}
                />
                <IconButton
                  name="cross"
                  size={10}
                  title="Close comment dialog"
                  onClick={closeDialog}
                />
              </Stack>
            </Stack>
            <Stack
              direction="vertical"
              css={{ overflow: 'auto' }}
              ref={listRef}
            >
              <Stack direction="vertical" gap={4}>
                <Stack
                  align="flex-start"
                  justify="space-between"
                  marginLeft={4}
                  marginRight={2}
                >
                  <AvatarBlock comment={comment} />
                  {state.user.id === comment.user.id && (
                    <Stack align="center">
                      <Menu>
                        <Menu.IconButton
                          name="more"
                          title="Comment actions"
                          size={12}
                        />
                        <Menu.List>
                          <Menu.Item
                            onSelect={() =>
                              actions.comments.deleteComment({
                                commentId: comment.id,
                              })
                            }
                          >
                            Delete
                          </Menu.Item>
                          <Menu.Item onSelect={() => setEditing(true)}>
                            Edit Comment
                          </Menu.Item>
                        </Menu.List>
                      </Menu>
                    </Stack>
                  )}
                </Stack>
                <Element
                  marginY={0}
                  marginX={4}
                  paddingBottom={6}
                  css={css({
                    borderBottom: '1px solid',
                    borderColor: 'sideBar.border',
                  })}
                >
                  {!editing ? (
                    <Markdown source={comment.content} />
                  ) : (
                    <EditComment
                      initialValue={comment.content}
                      onSave={async newValue => {
                        await actions.comments.updateComment({
                          commentId: comment.id,
                          content: newValue,
                        });
                        setEditing(false);
                      }}
                      onCancel={() => setEditing(false)}
                    />
                  )}
                </Element>
              </Stack>
              <>
                {comment.comments.map(reply =>
                  reply ? <Reply reply={reply} key={reply.id} /> : 'Loading...'
                )}
              </>
            </Stack>
            <AddReply comment={comment} />
          </>
        )}
      </Stack>
    </motion.div>
  );
};

const AddComment = ({ comment, onSave, onCancel }) => {
  const { actions } = useOvermind();
  const [value, setValue] = useState('');

  const saveComment = async () => {
    await actions.comments.updateComment({
      commentId: comment.id,
      content: value,
    });
    setValue('');
    onSave();
  };

  return (
    <Stack direction="vertical" gap={4}>
      <Stack
        justify="space-between"
        align="center"
        marginY={4}
        marginLeft={4}
        marginRight={2}
      >
        <Stack gap={2} align="center">
          <Avatar user={comment.user} />
          <Text size={3} weight="bold" variant="body">
            {comment.user.username}
          </Text>
        </Stack>
        <IconButton
          name="cross"
          size={10}
          title="Close comment dialog"
          onClick={onCancel}
        />
      </Stack>
      <Textarea
        autosize
        css={css({
          overflow: 'hidden',
          border: 'none',
          display: 'block',
          borderTop: '1px solid',
          borderColor: 'sideBar.border',
        })}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Add comment..."
        onKeyDown={async event => {
          if (event.keyCode === ENTER && !event.shiftKey) {
            saveComment();
            event.preventDefault();
          }
        }}
      />
    </Stack>
  );
};

const AddReply = ({ comment }) => {
  const { actions } = useOvermind();
  const [value, setValue] = useState('');

  const onSubmit = () => {
    setValue('');
    actions.comments.addComment({
      content: value,
      parentCommentId: comment.id,
    });
  };

  return (
    <Textarea
      autosize
      css={css({
        overflow: 'hidden',
        border: 'none',
        display: 'block',
        borderTop: '1px solid',
        borderColor: 'sideBar.border',
      })}
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder="Reply..."
      onKeyDown={event => {
        if (event.keyCode === ENTER && !event.shiftKey) onSubmit();
      }}
    />
  );
};

const getPositions = (currentCommentPositions, isCodeComment) => {
  const OVERLAP_WITH_SIDEBAR = -20;
  const OFFSET_TOP_FOR_ALIGNMENT = -90;
  const OFFSET_FOR_CODE = 500;

  // trying to match the position for code comments
  const FALLBACK_POSITION = { x: 800, y: 120 };

  let animateFrom = { x: null, y: null };

  if (currentCommentPositions?.trigger) {
    animateFrom = {
      x: currentCommentPositions.trigger.left,
      y: currentCommentPositions.trigger.top,
    };
  } else {
    // if we don't know the trigger, slide in from left
    // probably comment from permalink
    animateFrom = {
      x: 0,
      y: FALLBACK_POSITION.y,
    };
  }

  let dialogPosition = { x: null, y: null };

  if (currentCommentPositions?.dialog) {
    // if we know the expected dialog position
    // true for comments with code reference
    dialogPosition = {
      x: currentCommentPositions.dialog.left + OFFSET_FOR_CODE,
      y: currentCommentPositions.dialog.top + OFFSET_TOP_FOR_ALIGNMENT,
    };
  } else if (currentCommentPositions?.trigger) {
    // if don't know, we calculate based on the trigger
    // true for comments opened from the sidebar (both global and code)

    if (isCodeComment) {
      dialogPosition = {
        x: currentCommentPositions.trigger.right + OFFSET_FOR_CODE,
        y: currentCommentPositions.trigger.top + OFFSET_TOP_FOR_ALIGNMENT,
      };
    } else {
      dialogPosition = {
        x: currentCommentPositions.trigger.right + OVERLAP_WITH_SIDEBAR,
        y: currentCommentPositions.trigger.top + OFFSET_TOP_FOR_ALIGNMENT,
      };
    }
  } else {
    // if we know neither, we put it at  nice spot on the page
    // probably comment from permalink
    dialogPosition = FALLBACK_POSITION;
  }

  // check for window colisions here and offset positions more

  return { animateFrom, dialogPosition };
};
