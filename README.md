### Setting up development environment

This repo is the local development repo, it is meant to work in conjunction with the [production repo](https://github.com/inviti8/hvym).

Both https://github.com/inviti8/heavymeta-cli-dev and https://github.com/inviti8/hvym should be cloned together into the same local directory.

Requirements:  
[Pyenv](https://github.com/pyenv/pyenv)

  
Create 2 virtual environments both using python 3.9.18:

```
pyenv virtualenv 3.9.18 hvym_dev
pyenv virtualenv 3.9.18 hvym_build
```

Open a terminal in /heavymeta-cli-dev, cd into heavymeta-cli-dev, and activate hvym\_dev, then install packages:

```
pyenv activate hvym_dev
pip install -r requirements.txt
```

open another terminal, in /heavymeta-cli-dev, and activate hvym\_build, then install packages:

```
pyenv activate hvym_build
pip install -r build_requirements.txt
```

The main script for the CLI is 'hvym.py', work can be done in there.  When ready to test, in the 'hvym\_build' terminal environment run the build script with:

```
python build.py
```
Or if building for mac:
```
python build.py --mac
```

All files will be copied over to the local /hvym repo, requirements will be installed, and then the executable will be built into hvym/dist.

Optionally, the executable will be copied to the official heavymeta cli install directory @ ~/.local/share/heavymeta-cli/ with:

```
python build.py --test
```
Or if building for mac:
```
python build.py --mac --test
```