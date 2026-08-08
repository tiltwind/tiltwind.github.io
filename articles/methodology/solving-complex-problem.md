<!---
markmeta_author: 望哥
markmeta_date: 2020-05-14
markmeta_title: Tutorial on Solving a Complex Problem
markmeta_categories: methodology
markmeta_tags: complex
-->

# Tutorial on Solving a Complex Problem

来自[何毓琦](http://blog.sciencenet.cn/home.php?mod=space&uid=1565)科学网博客: http://blog.sciencenet.cn/blog-1565-1232111.html


Tutorial on Solving a Complex Problem – Returning Life to Normal with Safety and Economy after the Pandemic

> 解决复杂问题教程 -- 流行病之后在保障安全和经济生产的情况下让生活回归正轨


Lately in the US, and I suppose in the rest of the world also, leaders face the problem of “re-opening the market” after the abatement of the coronavirus pandemic. On the one end, you want to prevent an economic recession/depression as much as possible; on the other hand there is the safety of the population to be concerned. You wish to find an optimal course of action(s).

It is clear the possible courses of actions in such a real world problem are endless and with all kinds of uncertainty; and to consider and evaluate carefully each course of action will be an impossible calculation burden (note 1). Yet as a leader choosing a course of action he must, including “do nothing and let nature take its course” as a plan of action. In practice, we consult widely and decide on a plan based on our experience, knowledge, gut feeling and hope for the best. 

In this article, I wish to use this real life example to illustrate how one approach such a problem as a consulting engineer/adviser who can

- rationally attack such a problem in a systematic manner,
- quantify our approach,
- handle the uncertainties,
- make clear the distinction between theory and real world problems.

Hopefully such a discussion will help the general public in understanding the role and limit of science in policy making. Actually the US National Academy of Medicine has a series of webnairs discussion on the the details of the pandemic https://www.covid19conversations.org/. They should be taken as authoritative. My use of this pandemic example is for illustrative purpose of a complex problem only.   So here goes my article.

Consider the following steps you take as a leader
> 接下来的步骤将你作为主持人: 

1. Assembly a panel of economists, medical experts, government officials, merchant association representatives.
> 1. 组织一个包含经济学家、医学专家、政府官员、商业联盟代表的座谈小组

2. Start with a re-opening date and a schedule of phased return to normal (people will have different ideas about such a schedule. Don’t worry. Consider any reasonable schedule to start). Now ask the panel to give their best GUESS (no need for accuracy just estimate) as to the economic/environmental/safety consequences of such a “re-opening” schedule
> 2. 一开始(让大家给)一个复工的日期和一个回归正常的分阶段计划（大家会对这个计划有不同的意见，不用担心。大家可以考虑任何有理的计划便可以开始）。
现在，询问座谈小组给出这个复工计划在经济、环境、安全方面最大可能带来的结果（无需精确只需估计）。

3. Now using the same schedule but postpone the starting date by one week and re-estimate the consequences.
> 3. 现在同样的复工计划，但复工日期延迟一周，再评估带来的结果。

4. Repeat step 3 for the next nine weeks. This will give you a total of ten scenarios each with different consequences.
> 4. 对于接下来的9周都重复第3步, 这样会得到10种有着不同结果的方案。

5. Now repeat steps 2 thru 4  with a different schedule (again based on the suggestions of this panel of experts) and starting date to get another ten scenarios
> 5. 现在，(根据座谈小组的建议)基于一个新的复工计划和开始日期，重复第2到第4步，就会得到另外10种方案。

6. Repeat step 5 until you get a total of 200 different scenarios.
> 6. 重复第5步， 直到你得到了200种不同的方案。

7. Note this requires the panel to come up with only 20 not 200 different possible schedules – a very doable task.
> 7. 注意，这里要求座谈小组给出的是20种复工计划，而不是200种 —— 这个任务还是可以达成的。

8. You can order these 200 guessed solutions according to their estimated goodness. Again, you are asking the panel to make guesses and to do rough tradeoff and NOT to guarantee their assessments.
> 8. 评估这200种方案的优劣并排序。重申，你只是让座谈小组给出猜测，只做粗略的权衡，无需为他们的评估做出保证。

9. Now you have a list of 200 ordered (in terms of estimated goodness) solutions.
> 9. 现在你有 200个（按照优劣评估）排序的方案。

10.     Take the top12 of these estimated and ordered solutions, the theory of Ordinal Optimization then guarantees that among these 12 solution approaches, there are some 3 or 4 actual top 12 solutions if you really had the time to investigate all 200 of the approaches.
> 10. 选择评估排序方案中的前12个，根据序优化理论(theory of Ordinal Optimization) 如果你真有时间研究所有200种方案，可以确保在这12种方案中，有3-4种是最好的。

11.     Now you can take your time to examine these estimated top 12 schedules in greater detail and get at least 3 or 4 truly good schedules to pick from.
> 11. 现在，花时间评估这12种最好的方案的详细细节，找出真正好的3到4种方案（复工日期及计划）

Now let us discuss and make clear what we have done. 
- First, it should be clear that the numbers “200, top 12, starting date of one week apart . . .” used above are clearly arbitrary and used for illustrating purposes only. We can use other numbers as we see fit and desire. We used them for illustration and for coordinate the discussion with demonstration purposes http://people.seas.harvard.edu/~ho/DEDS/OO/Demo/Simple.html.  The theory and its conclusion covers other choices. 
- Second, the theory only avoids the impossible task of evaluating accurately all “200” possible solutions and replaced it with the more reasonable task of investigating in detail “12” of these solutions – a computational saving of approximately twenty to one. This is the contribution of the theory. 
- Third, human judgement/experience are still needed from the panel of experts to come up with possible initial schedules.  But we have utilized these expert where their expertise (gut feeling and experience but not accuracy) can be put to greatest use. 
- Fourth, we have glossed over the problem of ordering the consequences of the 200 estimated solutions. Note the problem of trade off economics with safety so that the alternatives can be ordered is a non-trivial problem in itself  - the so called pareto optimality problem. The theory/practice on that is worth a separate article or book http://blog.sciencenet.cn/home.php?mod=space&uid=468147&do=blog&id=723662 review: Introduction to Multi-objective Optimization.

> 对于以上过程需要说明:
> - 首先, 数字200，前12个, 1周的间隔时间等等，只是任意给的，只用于描述说明。只要觉得合适，可以用一些其他数字。我们用这些数字来说明，或出于组织模拟讨论的目的 http://people.seas.harvard.edu/~ho/DEDS/OO/Demo/Simple.html。 这个理论和它的结论覆盖了这些选择。
> - 第二, 这个理论避免评估200种可能方案这个不可能的任务，而是只研究12种方案的细节 —— 工作量节约到只有大约原来的1/20. 这是这个理论的贡献。
> - 第三, 需要座谈小组这些专家们的判断和经验来给出可能的计划，但我们只需他们的专业性（简单的感觉和经验而无需精确）就可以最好的利用到这些专家了。
> - 第四, 我们跳过了对200种方案结果进行排序的问题，注意为了方案能够排序而权衡经济和安全的问题本身并不是一个琐碎的问题 —— 它是一个[帕累托最优问题](https://zh.wikipedia.org/zh/帕累托最优)。 这方面的理论实践值得单独一本书介绍 http://blog.sciencenet.cn/home.php?mod=space&uid=468147&do=blog&id=723662 review: Introduction to Multi-objective Optimization.
 

Of course, the above is only an overly simplified description of policy making, decision choice, theory vs. practice and the role of each. Reader with more question are welcomed to comment and/or write to me directly with questions. 
> 当然，以上只是一个对政策制定、决策选择、理论和实践及其相互角色的一个粗略简单的介绍。



Note 1 Because of uncertainties, to calculate the expected cost/benefit of a complex problem via detail simulation one must average over a large number of repeated calculations. Even with fastest computer, this can often be extremely time consuming.
> 注意，由于不确定性, 通过对一个复杂问题细节进行模拟来计算期望的成本和收益需要取大量重复计算的平均值，就算对于最快的计算机，也经常可能很耗费时间。


Additional References http://blog.sciencenet.cn/home.php?mod=space&uid=1565&do=blog&id=1117595 Optimization Theory vs. Practice
http://blog.sciencenet.cn/home.php?mod=space&uid=1565&do=blog&id=759185 On Optimization
Ordinal optimization: Soft Optimization of Hard Problems, Y.C.Ho, Q.C. Zhao, Q.S. Jia, Springer 2007