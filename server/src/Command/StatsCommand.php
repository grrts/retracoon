<?php

namespace App\Command;

use App\Service\Stats;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:stats', description: 'Installs, retention and runs from the tracking events')]
final class StatsCommand extends Command
{
    public function __construct(private readonly Stats $stats)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('days', null, InputOption::VALUE_REQUIRED, 'How many days back', '14');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $r = $this->stats->report(max(1, min(90, (int) $input->getOption('days'))));
        $pct = fn (?float $x) => null === $x ? '-' : round($x * 100).'%';
        $output->writeln(\sprintf('Installs all time: %d. Finished the tutorial: %s.', $r['installsAllTime'], $pct($r['tutorialDone'])));
        $t = new Table($output);
        $t->setHeaders(['Day', 'Installs', 'Players', 'Runs', 'Daily runs', 'Median stage', 'Left area 1', 'D1', 'D7', 'D30']);
        foreach ($r['days'] as $d) {
            $t->addRow([$d['day'], $d['installs'], $d['players'], $d['runs'], $d['dailyRuns'], $d['medianStage'] ?? '-', $pct($d['leftArea1']), $pct($d['d1']), $pct($d['d7']), $pct($d['d30'])]);
        }
        $t->render();

        return Command::SUCCESS;
    }
}
