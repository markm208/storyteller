# Storyteller
While writing code we generate many creative ideas. We visualize our systems from different perspectives and weigh different options. Eventually, we make decisions about how our systems will evolve. Sometimes we make mistakes or learn more about what we are building and have to go back and revise our code.

Often, there is not a good place to write down our thoughts and ideas about this aspect of the development process. It can be difficult to learn from experienced developers because we don't get to see them make their decisions or hear the reasons why they made them. A less experienced developer can learn a great deal from a more experienced one if they can get inside the head of the more experienced developer and be walked through the evolution of their code.

Storyteller is an editor plugin that records all of the changes made during one or more programming sessions. It allows these changes to be played back and annotated. These 'playbacks' are stored in easily shareable web pages. This allows developers to reflect on what they have done, write down their thoughts, and draw pictures to tell the story of how their code has evolved. 


![Playback Overview](docs/images/playbackOverview.gif)

## Code Comments
Code comments are not always the best place to describe one's thoughts and ideas. After all, it doesn't make a lot of sense to have a code comment describing why someone changed the name of a variable from `weight` to `volumeOfPackage` if `weight` is no longer present in the code after the change. The same can be said of an algorithm that gets refactored to improve performance or a serious bug that was fixed.

_**These are evolutionary decisions that, if documented, can provide valuable learning experiences for others.**_

Some experts find code comments to be too verbose and annoying. Some newcomers complain that the lack of any meaningful comments is frustrating. The fact that there are different audiences for code comments makes it hard to find the right balance between what should be in them and what should be left out.

Storyteller allows code comments that are evolutionary in nature to be moved out of the code and stored separately from it. The extracted code comments are still directly linked to the code, however. Doing this allows there to be multiple sets of independent comments reaching different audiences.

These comments coexist together without interfering with each other. It will be up to the reader to decide which, if any comments, to display with the code.

In addition to moving the code comments out of the code, Storyteller was designed to allow two major differences between traditional code comments:

- It is possible to link a set of comments to **_time_** in addition to the location in code. This allows people to understand how the code has evolved. A developer can use these comments to create a narrative about how and why their code has changed over time that is linked to it's evolution.

- It is possible to create comments using a richer media than plain text so that developers can better describe their ideas and thought processes. Storyteller allows you to draw pictures, store screenshots that can be marked up, and record video in your comments.

## Examples
The output of the Storyteller tool is called a 'playback'. Here are a collection of playbacks in C++ and Clojure that I used for some of my computer science courses:
* [An Animated Introduction to Programming in C++](https://markm208.github.io/cppbook/)
* [An Animated Introduction to Clojure](https://markm208.github.io/cljbook/)

(this tool is not solely for educational purposes- it is for anyone who wants to show others how they thought about a problem while coding it).

Some notes about playback. You can use the pause/play button (`space bar`) to stop/restart a playback. To speed things up use `shift + up arrow` (`shift + down arrow` slows things down too). You can skip the animation of code altogether and just focus on the code and comments by selecting the forward button `>>` (`shift + right arrow` will accomplish this as well). 

## Storyteller: Docs
There is some documentation about viewing playbacks, creating playbacks, the Visual Studio Code editor, and using Storyteller as a version control system on the [Storyteller: Docs](https://markm208.github.io/storyteller/index.html) website.

## Contact
I am looking for people to contribute. Reach out to me if you are interested in helping build Storyteller!

I welcome any comments, suggestions, or questions. I look forward to having discussions about the ideas that this tool addresses.

Mark Mahoney [markm208@gmail.com](mailto:markm208@gmail.com)



