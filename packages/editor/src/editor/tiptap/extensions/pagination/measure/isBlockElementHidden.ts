/*
 * A collapsed scene hides its body blocks outright (`display: none`), so they
 * take up no space on the page and pagination has to count them as zero.
 * A zero `offsetHeight` on its own cannot say that — a block that could not be
 * measured yet reports zero too — but a hidden element also has no offset
 * parent, which is what separates "takes no space" from "not measurable".
 */
export const isBlockElementHidden = (dom: HTMLElement | null) => {
    if (!dom) {
        return false;
    }

    return dom.offsetParent === null && dom.offsetHeight === 0;
};
