/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {LifecycleProfile} from 'protocol';

import {getDirectiveName} from '../highlighter';

import {DirectiveForestHooks} from './hooks';

const markName = (s: string, method: Method) => `🅰️ ${s}#${method}`;

const supportsPerformance =
  globalThis.performance && typeof globalThis.performance.getEntriesByName === 'function';

type Method = keyof LifecycleProfile | 'changeDetection' | string;

const recordMark = (s: string, method: Method) => {
  if (supportsPerformance) {
    // tslint:disable-next-line:ban
    performance.mark(`${markName(s, method)}_start`);
  }
};

const endMark = (nodeName: string, method: Method) => {
  if (supportsPerformance) {
    const name = markName(nodeName, method);
    const start = `${name}_start`;
    const end = `${name}_end`;
    if (performance.getEntriesByName(start).length > 0) {
      // tslint:disable-next-line:ban
      performance.mark(end);
      performance.measure(name, start, end);
    }
    performance.clearMarks(start);
    performance.clearMarks(end);
    performance.clearMeasures(name);
  }
};

let timingAPIFlag = false;
let lastTimingAPIFlagStatus = false;

export const enableTimingAPI = () => {
  lastTimingAPIFlagStatus = timingAPIFlag;
  timingAPIFlag = true;
};
// If the recording was stopped from Chrome profiler (Performance panel)
// restore keep the value of the timings API flag as the user had set it
// in Angular DevTools before the recording started.
export const disableTimingAPI = (forBrowserProfiler: boolean = false) =>
  (timingAPIFlag = forBrowserProfiler && lastTimingAPIFlagStatus);

const timingAPIEnabled = () => timingAPIFlag;

let directiveForestHooks: DirectiveForestHooks;

export const initializeOrGetDirectiveForestHooks = (
  depsForTestOnly: {
    directiveForestHooks?: typeof DirectiveForestHooks;
  } = {},
) => {
  // Allow for overriding the DirectiveForestHooks implementation for testing purposes.
  if (depsForTestOnly.directiveForestHooks) {
    directiveForestHooks = new depsForTestOnly.directiveForestHooks();
  }

  if (directiveForestHooks) {
    return directiveForestHooks;
  } else {
    directiveForestHooks = new DirectiveForestHooks();
  }

  directiveForestHooks.profiler.subscribe({
    onChangeDetectionStart(component: any): void {
      if (!timingAPIEnabled()) {
        return;
      }
      recordMark(getDirectiveName(component), 'changeDetection');
    },
    onChangeDetectionEnd(component: any): void {
      if (!timingAPIEnabled()) {
        return;
      }
      endMark(getDirectiveName(component), 'changeDetection');
    },
    onLifecycleHookStart(component: any, lifecyle: keyof LifecycleProfile): void {
      if (!timingAPIEnabled()) {
        return;
      }
      recordMark(getDirectiveName(component), lifecyle);
    },
    onLifecycleHookEnd(component: any, lifecyle: keyof LifecycleProfile): void {
      if (!timingAPIEnabled()) {
        return;
      }
      endMark(getDirectiveName(component), lifecyle);
    },
    onOutputStart(component: any, output: string): void {
      if (!timingAPIEnabled()) {
        return;
      }
      recordMark(getDirectiveName(component), output);
    },
    onOutputEnd(component: any, output: string): void {
      if (!timingAPIEnabled()) {
        return;
      }
      endMark(getDirectiveName(component), output);
    },
  });
  directiveForestHooks.initialize();
  return directiveForestHooks;
};
