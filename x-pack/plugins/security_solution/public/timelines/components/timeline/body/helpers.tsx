/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { get, isEmpty } from 'lodash/fp';
import { useDispatch } from 'react-redux';

import { Ecs } from '../../../../../common/ecs';
import { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import { setActiveTabTimeline, updateTimelineGraphEventId } from '../../../store/timeline/actions';
import {
  TimelineEventsType,
  TimelineTypeLiteral,
  TimelineType,
  TimelineId,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import { OnPinEvent, OnUnPinEvent } from '../events';
import { ActionIconItem } from './actions/action_icon_item';
import * as i18n from './translations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const omitTypenameAndEmpty = (k: string, v: any): any | undefined =>
  k !== '__typename' && v != null ? v : undefined;

export const stringifyEvent = (ecs: Ecs): string => JSON.stringify(ecs, omitTypenameAndEmpty, 2);

export const eventHasNotes = (noteIds: string[]): boolean => !isEmpty(noteIds);

export const getPinTooltip = ({
  isPinned,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  eventHasNotes,
  timelineType,
}: {
  isPinned: boolean;
  eventHasNotes: boolean;
  timelineType: TimelineTypeLiteral;
}) =>
  timelineType === TimelineType.template
    ? i18n.DISABLE_PIN
    : isPinned && eventHasNotes
    ? i18n.PINNED_WITH_NOTES
    : isPinned
    ? i18n.PINNED
    : i18n.UNPINNED;

export interface IsPinnedParams {
  eventId: string;
  pinnedEventIds: Readonly<Record<string, boolean>>;
}

export const eventIsPinned = ({ eventId, pinnedEventIds }: IsPinnedParams): boolean =>
  pinnedEventIds[eventId] === true;

export interface GetPinOnClickParams {
  allowUnpinning: boolean;
  eventId: string;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  isEventPinned: boolean;
}

export const getPinOnClick = ({
  allowUnpinning,
  eventId,
  onPinEvent,
  onUnPinEvent,
  isEventPinned,
}: GetPinOnClickParams) => {
  if (!allowUnpinning) {
    return;
  }

  if (isEventPinned) {
    onUnPinEvent(eventId);
  } else {
    onPinEvent(eventId);
  }
};

/**
 * Creates mapping of eventID -> fieldData for given fieldsToKeep. Used to store additional field
 * data necessary for custom timeline actions in conjunction with selection state
 * @param timelineData
 * @param eventIds
 * @param fieldsToKeep
 */
export const getEventIdToDataMapping = (
  timelineData: TimelineItem[],
  eventIds: string[],
  fieldsToKeep: string[]
): Record<string, TimelineNonEcsData[]> =>
  timelineData.reduce((acc, v) => {
    const fvm = eventIds.includes(v._id)
      ? { [v._id]: v.data.filter((ti) => fieldsToKeep.includes(ti.field)) }
      : {};
    return {
      ...acc,
      ...fvm,
    };
  }, {});

export const isEventBuildingBlockType = (event: Ecs): boolean =>
  !isEmpty(event.signal?.rule?.building_block_type);

export const isEvenEqlSequence = (event: Ecs): boolean => {
  if (!isEmpty(event.eql?.sequenceNumber)) {
    try {
      const sequenceNumber = (event.eql?.sequenceNumber ?? '').split('-')[0];
      return parseInt(sequenceNumber, 10) % 2 === 0;
    } catch {
      return false;
    }
  }
  return false;
};
/** Return eventType raw or signal or eql */
export const getEventType = (event: Ecs): Omit<TimelineEventsType, 'all'> => {
  if (!isEmpty(event.signal?.rule?.id)) {
    return 'signal';
  } else if (!isEmpty(event.eql?.parentId)) {
    return 'eql';
  }
  return 'raw';
};

export const isInvestigateInResolverActionEnabled = (ecsData?: Ecs) =>
  (get(['agent', 'type', 0], ecsData) === 'endpoint' ||
    (get(['agent', 'type', 0], ecsData) === 'winlogbeat' &&
      get(['event', 'module', 0], ecsData) === 'sysmon')) &&
  get(['process', 'entity_id'], ecsData)?.length === 1 &&
  get(['process', 'entity_id', 0], ecsData) !== '';

interface InvestigateInResolverActionProps {
  ariaLabel?: string;
  timelineId: string;
  ecsData: Ecs;
}

const InvestigateInResolverActionComponent: React.FC<InvestigateInResolverActionProps> = ({
  ariaLabel = i18n.ACTION_INVESTIGATE_IN_RESOLVER,
  timelineId,
  ecsData,
}) => {
  const dispatch = useDispatch();
  const isDisabled = useMemo(() => !isInvestigateInResolverActionEnabled(ecsData), [ecsData]);
  const handleClick = useCallback(() => {
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: ecsData._id }));
    if (TimelineId.active) {
      dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
    }
  }, [dispatch, ecsData._id, timelineId]);

  return (
    <ActionIconItem
      ariaLabel={ariaLabel}
      content={
        isDisabled ? i18n.INVESTIGATE_IN_RESOLVER_DISABLED : i18n.ACTION_INVESTIGATE_IN_RESOLVER
      }
      dataTestSubj="investigate-in-resolver"
      iconType="analyzeEvent"
      isDisabled={isDisabled}
      onClick={handleClick}
    />
  );
};

InvestigateInResolverActionComponent.displayName = 'InvestigateInResolverActionComponent';

export const InvestigateInResolverAction = React.memo(InvestigateInResolverActionComponent);

export const ROW_RENDERER_CLASS_NAME = 'row-renderer';

export const NOTES_CONTAINER_CLASS_NAME = 'notes-container';

export const NOTE_CONTENT_CLASS_NAME = 'note-content';
