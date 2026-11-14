# Third-party notices

NearCommerce's own source code is released under the MIT License (see `LICENSE`). The items
below are not covered by that license and keep their own terms.

## YOLOv8n object-detection model (AGPL-3.0)

`apps/web/public/models/yolo.onnx` is an export of the Ultralytics YOLOv8n model. Ultralytics
publishes its models under the **GNU AGPL-3.0** (or a paid Enterprise License). That file, and
anything that is a derivative work of it, remains under those terms; the MIT license of this
repository does not apply to it.

Before distributing or commercially operating a build that ships this model, do one of the
following:

1. Comply with AGPL-3.0 for the affected parts (including offering corresponding source), or
2. Obtain an Ultralytics Enterprise License, or
3. Replace the model with a permissively licensed detector. The cropper falls back to manual
   cropping, so the product works without it.

Ultralytics' licensing page is the authoritative source: https://www.ultralytics.com/license

## npm dependencies

Runtime and build dependencies are installed from npm under their own licenses; see each
package's `LICENSE` file in `node_modules` or run a license checker of your choice.
