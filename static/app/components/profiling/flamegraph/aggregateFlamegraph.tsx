import type {ReactElement} from 'react';
import {Fragment, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import * as Sentry from '@sentry/react';
import type {mat3} from 'gl-matrix';
import {vec2} from 'gl-matrix';

import {addErrorMessage} from 'sentry/actionCreators/indicator';
import {ContinuousFlamegraphContextMenu} from 'sentry/components/profiling/flamegraph/flamegraphContextMenu';
import {FlamegraphWarnings} from 'sentry/components/profiling/flamegraph/flamegraphOverlays/FlamegraphWarnings';
import {FlamegraphZoomView} from 'sentry/components/profiling/flamegraph/flamegraphZoomView';
import {defined} from 'sentry/utils';
import type {
  CanvasPoolManager,
  CanvasScheduler,
} from 'sentry/utils/profiling/canvasScheduler';
import {CanvasView} from 'sentry/utils/profiling/canvasView';
import type {Flamegraph as FlamegraphModel} from 'sentry/utils/profiling/flamegraph';
import {useFlamegraphPreferences} from 'sentry/utils/profiling/flamegraph/hooks/useFlamegraphPreferences';
import {useFlamegraphProfiles} from 'sentry/utils/profiling/flamegraph/hooks/useFlamegraphProfiles';
import {useDispatchFlamegraphState} from 'sentry/utils/profiling/flamegraph/hooks/useFlamegraphState';
import {useFlamegraphTheme} from 'sentry/utils/profiling/flamegraph/useFlamegraphTheme';
import {FlamegraphCanvas} from 'sentry/utils/profiling/flamegraphCanvas';
import type {FlamegraphFrame} from 'sentry/utils/profiling/flamegraphFrame';
import {
  computeConfigViewWithStrategy,
  initializeFlamegraphRenderer,
  useResizeCanvasObserver,
} from 'sentry/utils/profiling/gl/utils';
import {FlamegraphRenderer2D} from 'sentry/utils/profiling/renderers/flamegraphRenderer2D';
import {FlamegraphRendererWebGL} from 'sentry/utils/profiling/renderers/flamegraphRendererWebGL';
import {Rect} from 'sentry/utils/profiling/speedscope';
import type {QueryStatus} from 'sentry/utils/queryClient';
import {useFlamegraph} from 'sentry/views/profiling/flamegraphProvider';
import {useProfileGroup} from 'sentry/views/profiling/profileGroupProvider';

interface AggregateFlamegraphProps {
  canvasPoolManager: CanvasPoolManager;
  filter: 'application' | 'system' | 'all';
  onResetFilter: () => void;
  scheduler: CanvasScheduler;
  status: QueryStatus;
}

export function AggregateFlamegraph(props: AggregateFlamegraphProps): ReactElement {
  const dispatch = useDispatchFlamegraphState();

  const flamegraph = useFlamegraph();
  const profileGroup = useProfileGroup();

  const flamegraphTheme = useFlamegraphTheme();
  const profiles = useFlamegraphProfiles();
  const {colorCoding} = useFlamegraphPreferences();

  const [flamegraphCanvasRef, setFlamegraphCanvasRef] =
    useState<HTMLCanvasElement | null>(null);
  const [flamegraphOverlayCanvasRef, setFlamegraphOverlayCanvasRef] =
    useState<HTMLCanvasElement | null>(null);

  const flamegraphCanvas = useMemo(() => {
    if (!flamegraphCanvasRef) {
      return null;
    }
    return new FlamegraphCanvas(flamegraphCanvasRef, vec2.fromValues(0, 0));
  }, [flamegraphCanvasRef]);

  const flamegraphView = useMemo<CanvasView<FlamegraphModel> | null>(
    () => {
      if (!flamegraphCanvas) {
        return null;
      }

      const newView = new CanvasView({
        canvas: flamegraphCanvas,
        model: flamegraph,
        options: {
          inverted: flamegraph.inverted,
          minWidth: flamegraph.profile.minFrameDuration,
          barHeight: flamegraphTheme.SIZES.BAR_HEIGHT,
          depthOffset: flamegraphTheme.SIZES.AGGREGATE_FLAMEGRAPH_DEPTH_OFFSET,
          configSpaceTransform: undefined,
        },
      });

      return newView;
    },

    // We skip position.view dependency because it will go into an infinite loop

    [flamegraph, flamegraphCanvas, flamegraphTheme]
  );

  // Uses a useLayoutEffect to ensure that these top level/global listeners are added before
  // any of the children components effects actually run. This way we do not lose events
  // when we register/unregister these top level listeners.
  useLayoutEffect(() => {
    if (!flamegraphCanvas || !flamegraphView) {
      return undefined;
    }

    // This code below manages the synchronization of the config views between spans and flamegraph
    // We do so by listening to the config view change event and then updating the other views accordingly which
    // allows us to keep the X axis in sync between the two views but keep the Y axis independent
    const onConfigViewChange = (rect: Rect, sourceConfigViewChange: CanvasView<any>) => {
      if (sourceConfigViewChange === flamegraphView) {
        flamegraphView.setConfigView(rect.withHeight(flamegraphView.configView.height));
      }

      props.canvasPoolManager.draw();
    };

    const onTransformConfigView = (
      mat: mat3,
      sourceTransformConfigView: CanvasView<any>
    ) => {
      if (sourceTransformConfigView === flamegraphView) {
        flamegraphView.transformConfigView(mat);
      }

      props.canvasPoolManager.draw();
    };

    const onResetZoom = () => {
      flamegraphView.resetConfigView(flamegraphCanvas);
      props.canvasPoolManager.draw();
    };

    const onZoomIntoFrame = (frame: FlamegraphFrame, strategy: 'min' | 'exact') => {
      const newConfigView = computeConfigViewWithStrategy(
        strategy,
        flamegraphView.configView,
        new Rect(frame.start, frame.depth, frame.end - frame.start, 1)
      ).transformRect(flamegraphView.configSpaceTransform);

      flamegraphView.setConfigView(newConfigView);

      props.canvasPoolManager.draw();
    };

    props.scheduler.on('set config view', onConfigViewChange);
    props.scheduler.on('transform config view', onTransformConfigView);
    props.scheduler.on('reset zoom', onResetZoom);
    props.scheduler.on('zoom at frame', onZoomIntoFrame);

    return () => {
      props.scheduler.off('set config view', onConfigViewChange);
      props.scheduler.off('transform config view', onTransformConfigView);
      props.scheduler.off('reset zoom', onResetZoom);
      props.scheduler.off('zoom at frame', onZoomIntoFrame);
    };
  }, [props.canvasPoolManager, flamegraphCanvas, flamegraphView, props.scheduler]);

  const flamegraphCanvases = useMemo(() => {
    return [flamegraphCanvasRef, flamegraphOverlayCanvasRef];
  }, [flamegraphCanvasRef, flamegraphOverlayCanvasRef]);

  useResizeCanvasObserver(
    flamegraphCanvases,
    props.canvasPoolManager,
    flamegraphCanvas,
    flamegraphView
  );

  const flamegraphRenderer = useMemo(() => {
    if (!flamegraphCanvasRef) {
      return null;
    }

    const renderer = initializeFlamegraphRenderer(
      [FlamegraphRendererWebGL, FlamegraphRenderer2D],
      [
        flamegraphCanvasRef,
        flamegraph,
        flamegraphTheme,
        {
          colorCoding,
          draw_border: true,
        },
      ]
    );

    if (renderer === null) {
      Sentry.captureException('Failed to initialize a flamegraph renderer');
      addErrorMessage('Failed to initialize renderer');
      return null;
    }

    return renderer;
  }, [colorCoding, flamegraph, flamegraphCanvasRef, flamegraphTheme]);

  useEffect(() => {
    if (defined(profiles.threadId)) {
      return;
    }
    const threadID =
      typeof profileGroup.activeProfileIndex === 'number'
        ? profileGroup.profiles[profileGroup.activeProfileIndex]?.threadId
        : null;
    // fall back case, when we finally load the active profile index from the profile,
    // make sure we update the thread id so that it is show first
    if (defined(threadID)) {
      dispatch({
        type: 'set thread id',
        payload: threadID,
      });
    }
  }, [profileGroup, profiles.threadId, dispatch]);

  return (
    <Fragment>
      <FlamegraphWarnings
        flamegraph={flamegraph}
        requestState={
          props.status === 'pending'
            ? {type: 'loading'}
            : props.status === 'error'
              ? {type: 'errored', error: 'error'}
              : {type: 'resolved', data: null}
        }
        onResetFilter={props.onResetFilter}
        filter={props.filter}
      />
      <FlamegraphZoomView
        profileGroup={profileGroup}
        disableGrid
        disableCallOrderSort
        disableColorCoding
        scheduler={props.scheduler}
        canvasPoolManager={props.canvasPoolManager}
        flamegraph={flamegraph}
        flamegraphRenderer={flamegraphRenderer}
        flamegraphCanvas={flamegraphCanvas}
        flamegraphCanvasRef={flamegraphCanvasRef}
        flamegraphOverlayCanvasRef={flamegraphOverlayCanvasRef}
        flamegraphView={flamegraphView}
        setFlamegraphCanvasRef={setFlamegraphCanvasRef}
        setFlamegraphOverlayCanvasRef={setFlamegraphOverlayCanvasRef}
        contextMenu={ContinuousFlamegraphContextMenu}
      />
    </Fragment>
  );
}
