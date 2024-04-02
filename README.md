# Automatic Game Variable Exposer for Legends of Idleon

![idleonLogo](https://github.com/ahvonenj/idleon-auto-expose/assets/8504168/c43e8590-bb6a-4f27-96e5-9c86ca8552ea)


- https://www.legendsofidleon.com/
- https://store.steampowered.com/app/1476970/IdleOn__The_Idle_MMO/

## About

This is a small tool which automatically patches the `N.js` file within the `app.asar` archive, and by doing so, globally exposes the main game object and all if its child objects so that they can be accessed with e.g. DevTools. After patching the `N.js` file and repackaging it in the `app.asar` file, the main game object is exposed as `exposedGame` global variable within the `index.html (IFrame)` JavaScript context.

## Requirement(s)

- Node.js installed
- Legends of Idleon game
- File archiver tool

## What this is and isn't

**It is not**

- A game hack or a hacking tool
- Gem generator
- Botting framework

**It is**

- A tool to help with third-party tool development
- Automated way to globally expose one of the most important game related object(s) after updates
- Educational project to aid hobbyists working with `.asar` files and JavaScript-based games 

## Usage

### Getting the main idleon script file

- Find `app.asar` file at `steamapps/common/Legends of Idleon/resources`
- Open the `app.asar` with a file archiver tool, such as 7zip
- Locate `N.js` within the `app.asar` file at `distBuild/static/game/`
- Drag the `N.js` file out of the archive somewhere

### Patching the script file

- Copy and paste `expose_idleon.mjs` file from this repository into the same folder as where you put the `N.js` file in
- Open a new terminal window inside the folder where the `expose_idleon.mjs` and `N.js` files are now located
- Type `node expose_idleon.mjs` to the terminal and press enter

If everything went well, you should see output like this:

```
Reading N.js
Seeking patchable patterns
SUCCESS: Patterns found, game is patchable!
Patch target index: 17447073
Patch target pattern: var bi={}
Engine variable name: z
Main variable name: I
Patching game
PATCHED, game engine is now exposed as: I.exposedGame=z;
Writing patched/N.js - drop this into app.asar distBuild/static/game/
```

There are three main errors related to the patching itself that could happen:

**Patch location pattern not found!**  
The patcher is unable to find the patchable / injectable location within the `N.js` file.

**Engine variable name not found!**  
The patcher cannot find the name of the obfuscated variable which represents the main game object.

**Main variable name not found!**  
The patcher cannot find the name of the obfuscated variable (which is also a scoped function parameter) which represents the global window object of the Electron Isolated Context.

**What to do?**  
The process to find the patchable location and the names of the obfuscated variables, as well as the process to generate appropriate patterns to find them is complicated enough to explain here. If the patcher throws a "not found" error, please open a new issue. A situation like this can happen after a new game update - the game is reobfuscated and repacked when the game is updated and the reobfuscated variable names might be obfuscated in such a way that the current matching patterns the script uses might not be compatible. 

### Repackaging the patched N.js file into the app.asar archive

- After running the `expose_idleon.mjs` script, there should now be a new folder called `patched` next to the `N.js` and `expose_idleon.mjs` files
- There should be another `N.js` file inside the `patched` folder - this is the patched `N.js` file
- Open the `app.asar` file again with a file archiver tool and navigate to the `distBuild/static/game/` folder within the archive
- Drag the `N.js` file inside the `patched` folder into the archive, replacing the `N.js` file there

Continue to the "Enabling Devtools" section.

## Enabling devtools

Now that the game itself is patched and the main game object is exposed, we still need to enable to use of devtools. This needs to be done by hand for now:

- Open the `app.asar` once more and navigate to `src/main/`
- Pull out `index.js`
- Open `index.js` with your favourite text / code editor

Inside the `createMainWindow` function, we're looking for two locations:

**Location 1:**

Change the `devTools: isDevelopment` to `devTools: true` as shown below.

```js
const window = new BrowserWindow({
  width: 960,
  height: 572,
  resizable: true,
  minimizable: false,
  webPreferences: {
    title: "Legends Of Idleon | Loading...",
    nodeIntegration: false,
    contextIsolation: true,
    backgroundThrottling: false,
    preload: path.join(__dirname, "preload.js"),
    devTools: true,
    sandbox: true,
  },
  frame: false,
});
```

**Location 2:**

Right under the `window` declaration, there is an `if-clause`. Change the condition of the `if-clause` from `if(isDevelopment)` to `if(true)` as shown below:

```js
if (true) {
    window.webContents.openDevTools()
}
```

After making the changes, save the `index.js` file and drag it back inside the `app.asar` file, replacing the `index.js` file there, as explained before with the `N.js` file. The devtools window should now pop up when starting the game.

Continue to the "What now?" section.

## What now?

Now that the game is patched and we've enabled the devtools, we're able to find the main game object (exposed by the patcher) with the devtools:

- Select the `Console` tab inside the devtools
- Click on the dropdown menu that should say "Top" and change the JavaScript context to `index.html (IFrame)`
- With the JavaScript context set to `index.html (IFrame)`, we can now type `exposedGame` into the console and press enter
- The console should output the contents of the main game object
- You'll know this is the correct object, if there are multiple lines starting with `box2D.collision.something`, `box2D.common.something`, etc.

### Additional Information

The main game object should contain almost everything one might need to fiddle with the game.

As for the specifics when it comes to finding something, that I can't help with. However, I will leave you with these tips:

Inside the main game object (exposed as `exposedGame`), look for the child objects starting with `script.` and specifically the ones starting with `script.SceneEvents_<number>`. These child objects contain a lot of attributes and methods related to different features in the game, such as skills, minigames, etc.

The `exposedGame["com.stencyl.behavior.Script"]` is what I would describe as sort of the underlying engine of the game. It contains a great deal of useful methods, one of which in particular is `getGameAttribute`.

Try printing out the contents of `exposedGame["com.stencyl.behavior.Script"].getGameAttribute("PixelHelperActor")` into the console for some very interesting objects that the game itself uses for many things and which might come very handy when fiddling with the game yourself :>

## Extra

**Tested to be working with at least these three (latest at the time of writing) updates:**  
- Minibosses update - March 31, 2024
- Tome update - March 16, 2024
- Quality of Life update - March 9, 2024
