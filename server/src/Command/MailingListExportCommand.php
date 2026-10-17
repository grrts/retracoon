<?php

namespace App\Command;

use App\Repository\SubscriberRepository;
use App\Service\Periods;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

#[AsCommand(name: 'app:mailing-list:export', description: 'Confirmed mailing list addresses as CSV, each with its unsubscribe link')]
final class MailingListExportCommand extends Command
{
    public function __construct(private readonly SubscriberRepository $subscribers, private readonly Periods $periods, private readonly UrlGeneratorInterface $urls)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('output', 'o', InputOption::VALUE_REQUIRED, 'Write to this file instead of the screen')
            ->setHelp('Every mail sent to the list must carry the address\'s unsubscribe link (also usable as the List-Unsubscribe header; it accepts one-click POSTs). Links use DEFAULT_URI.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->subscribers->purgeUnconfirmed($this->periods->now());
        $file = $input->getOption('output');
        $out = fopen($file ?? 'php://memory', 'w+');
        if (false === $out) {
            $output->writeln("<error>Cannot write $file</error>");

            return Command::FAILURE;
        }
        fputcsv($out, ['email', 'confirmed_at', 'unsubscribe_url'], escape: '');
        $n = 0;
        foreach ($this->subscribers->confirmed() as $s) {
            $url = $this->urls->generate('list_unsubscribe', ['token' => $s->getToken()], UrlGeneratorInterface::ABSOLUTE_URL);
            fputcsv($out, [$s->getEmail(), $s->getConfirmedAt()?->format('Y-m-d\TH:i:s\Z'), $url], escape: '');
            ++$n;
        }
        if (null === $file) {
            rewind($out);
            $output->write((string) stream_get_contents($out), false, OutputInterface::OUTPUT_RAW);
        } else {
            $output->writeln("Wrote $n addresses to $file.");
        }
        fclose($out);

        return Command::SUCCESS;
    }
}
