import { setSlowQueryThreshold, queryProfilerPlugin } from './query-profiler.plugin';
import { Schema } from 'mongoose';

describe('queryProfilerPlugin', () => {
  it('should register pre and post hooks for find, findOne, countDocuments, aggregate', () => {
    const schema = new Schema({ name: String });
    const preSpy = jest.spyOn(schema, 'pre');
    const postSpy = jest.spyOn(schema, 'post');

    queryProfilerPlugin(schema);

    const preOps = preSpy.mock.calls.map((c) => c[0]);
    expect(preOps).toContain('find');
    expect(preOps).toContain('findOne');
    expect(preOps).toContain('countDocuments');
    expect(preOps).toContain('aggregate');

    const postOps = postSpy.mock.calls.map((c) => c[0]);
    expect(postOps).toContain('find');
    expect(postOps).toContain('findOne');
    expect(postOps).toContain('countDocuments');
    expect(postOps).toContain('aggregate');
  });

  it('should allow setting slow query threshold', () => {
    // Should not throw
    setSlowQueryThreshold(500);
    setSlowQueryThreshold(100);
  });
});
