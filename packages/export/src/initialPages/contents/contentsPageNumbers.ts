/**
 * Page numbers resolved after script pagination. Optional everywhere, because
 * willAddAutomaticBalancingBlank renders initial pages from the plan alone.
 */
export interface ContentsPageNumbers {
    scriptPageNumberByBlockId: Map<string, number>,
    scoreStartPageByMusicId: Map<string, number>,
}
