# ThunderBuild

ThunderBuild is a powerful web-based 3D construction and design tool that enables users to create, manipulate, and visualize 3D structures in real-time. Built with modern web technologies, it provides an intuitive interface for architectural and construction planning.

## Core Features

- **3D Object Manipulation**
  - Create basic 3D shapes (cubes, cylinders, etc.)
  - Move, rotate, and scale objects with precision
  - Snap-to-grid functionality for accurate placement
  - Transform controls for intuitive object manipulation

- **Measurement System**
  - Grid-based measurement system
  - Precise object dimensioning
  - Real-world scale reference

- **Interface Controls**
  - Camera controls: orbit, pan, and zoom
  - Grid toggle for reference
  - Context menu for quick actions
  - Properties panel for object details

## Getting Started

1. Open `index.html` in a modern web browser
2. Use left-click to select objects
3. Use right-click to open the context menu
4. Camera Controls:
   - Left mouse button: Rotate view
   - Right mouse button: Pan view
   - Mouse wheel: Zoom in/out

## Controls

- **Object Selection**: Left-click on an object
- **Camera Movement**: 
  - Orbit: Left mouse button + drag
  - Pan: Right mouse button + drag
  - Zoom: Mouse wheel
- **Object Manipulation**:
  - Move: Drag the colored axes
  - Rotate: Use the rotation gizmo
  - Scale: Use the scale handles
- **Grid**: Toggle grid visibility for reference

## Technical Details

Built using:
- Three.js for 3D rendering
- Transform Controls for object manipulation
- Orbit Controls for camera movement
- Custom UI components for interaction

## Future Development

Planned features include:
- Enhanced measurement tools
- Material library
- Scene export capabilities
- Collaborative editing

## Browser Support

Optimized for modern browsers with WebGL support:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

ThunderBuild is open source software licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

The MIT License is a permissive license that is short and to the point. It lets people do anything they want with your code as long as they provide attribution back to you and don't hold you liable.

### Third-Party Licenses

ThunderBuild uses the following open-source libraries:

- [Three.js](https://github.com/mrdoob/three.js/) - MIT License
- [Hammer.js](https://github.com/hammerjs/hammer.js) - MIT License

## Project Structure

```
ThunderBuild/
├── index.html    # Main application file (includes HTML, CSS, and JS)
└── README.md     # Project documentation
