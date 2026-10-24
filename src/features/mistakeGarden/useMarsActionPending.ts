import { useWorldProgress } from '@/domain/universe/progression'

/** Is there something to do in the Mars bed right now (a found seed waiting)? */
export function useMarsActionPending(): boolean {
  const { isDiscovered, stageOf } = useWorldProgress()
  return stageOf('mars') < 0 && isDiscovered('mars-seed')
}
