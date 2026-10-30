/**
 * Page numbers resolved after script pagination. Optional everywhere, because
 * willAddAutomaticBalancingBlank renders initial pages from the plan alone.
 */
export interface ContentsPageNumbers {
    scriptPageNumberByBlockId: Map<string, number | string>,
    scoreStartPageByMusicId: Map<string, number>,
}
